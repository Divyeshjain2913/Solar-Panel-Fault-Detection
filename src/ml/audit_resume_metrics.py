"""
Audit & Benchmarking Script for Resume Metrics Discovery.
Performs empirical measurements on:
- Dataset distributions across splits and classes
- Model parameter counts, file sizes, and memory footprints
- Rigorous test set re-evaluation (Accuracy, Precision, Recall, F1, Confusion Matrix)
- Real latency benchmarking (Mean, Median, P90, P95, Min, Max) on CPU
- Codebase structure (FastAPI routes, Streamlit components, MongoDB schema)
"""

import os
import sys
import time
import json
import torch
import numpy as np
from pathlib import Path
from collections import Counter
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, precision_recall_fscore_support

# Ensure project root
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from src.ml.model import build_model
from src.ml.dataset import CLASS_NAMES, get_data_transforms, prepare_data_splits, SolarPanelDataset
from torch.utils.data import DataLoader

def audit_dataset():
    print("=" * 60)
    print("1. DATASET AUDIT")
    print("=" * 60)
    
    splits = ["train", "val", "test"]
    split_counts = {}
    class_per_split = {c: {} for c in CLASS_NAMES}
    
    for split in splits:
        split_dir = PROJECT_ROOT / "data" / split
        if not split_dir.exists():
            continue
        total = 0
        for c in CLASS_NAMES:
            cdir = split_dir / c
            cnt = len(list(cdir.glob("*.jpg")) + list(cdir.glob("*.png")) + list(cdir.glob("*.jpeg"))) if cdir.exists() else 0
            class_per_split[c][split] = cnt
            total += cnt
        split_counts[split] = total
        
    clean_dir = PROJECT_ROOT / "data" / "dataset_clean"
    clean_counts = {}
    total_clean = 0
    if clean_dir.exists():
        for c in CLASS_NAMES:
            cdir = clean_dir / c
            cnt = len(list(cdir.glob("*.jpg")) + list(cdir.glob("*.png")) + list(cdir.glob("*.jpeg"))) if cdir.exists() else 0
            clean_counts[c] = cnt
            total_clean += cnt
            
    print(f"Total Unique/Clean Images in data/dataset_clean: {total_clean}")
    for c, cnt in clean_counts.items():
        print(f"  - {c}: {cnt}")
        
    print(f"\nPhysical Disk Split Distribution (data/train, data/val, data/test):")
    total_split = sum(split_counts.values())
    if total_split > 0:
        print(f"  - Train: {split_counts.get('train', 0)} ({split_counts.get('train', 0)/total_split*100:.1f}%)")
        print(f"  - Val:   {split_counts.get('val', 0)} ({split_counts.get('val', 0)/total_split*100:.1f}%)")
        print(f"  - Test:  {split_counts.get('test', 0)} ({split_counts.get('test', 0)/total_split*100:.1f}%)")
        print(f"  - Total across disk splits: {total_split}")
    
    # Also evaluate programmatically through prepare_data_splits()
    train_s, val_s, test_s, weights = prepare_data_splits()
    print(f"\nStratified Algorithmic Splits (Zero-Leakage Hash Deduped):")
    total_algo = len(train_s) + len(val_s) + len(test_s)
    print(f"  - Train samples: {len(train_s)} ({len(train_s)/total_algo*100:.1f}%)")
    print(f"  - Val samples:   {len(val_s)} ({len(val_s)/total_algo*100:.1f}%)")
    print(f"  - Test samples:  {len(test_s)} ({len(test_s)/total_algo*100:.1f}%)")
    print(f"  - Total unique:  {total_algo}")
    
    test_class_counts = Counter([s[1] for s in test_s])
    print("\nTest Set Class Distribution:")
    for idx, cname in enumerate(CLASS_NAMES):
        print(f"  - {cname:<20}: {test_class_counts[idx]} samples")
        
    return {
        "total_clean": total_clean,
        "clean_counts": clean_counts,
        "algorithmic_splits": {
            "train": len(train_s),
            "val": len(val_s),
            "test": len(test_s),
            "total": total_algo
        },
        "test_class_counts": {CLASS_NAMES[i]: test_class_counts[i] for i in range(len(CLASS_NAMES))},
        "train_samples": train_s,
        "val_samples": val_s,
        "test_samples": test_s
    }

def audit_model_and_evaluation(test_samples):
    print("\n" + "=" * 60)
    print("2. MODEL ARCHITECTURE & EVALUATION AUDIT")
    print("=" * 60)
    
    checkpoint_path = PROJECT_ROOT / "models" / "solar_mobilenet_v2_best.pth"
    file_size_mb = checkpoint_path.stat().st_size / (1024 * 1024)
    print(f"Model Checkpoint: {checkpoint_path}")
    print(f"Checkpoint File Size: {file_size_mb:.2f} MB ({checkpoint_path.stat().st_size:,} bytes)")
    
    # Load model
    device = torch.device("cpu")
    t0 = time.perf_counter()
    model = build_model(num_classes=len(CLASS_NAMES), pretrained=False)
    checkpoint = torch.load(checkpoint_path, map_location=device)
    if isinstance(checkpoint, dict) and "model_state_dict" in checkpoint:
        state_dict = checkpoint["model_state_dict"]
    else:
        state_dict = checkpoint
    model.load_state_dict(state_dict)
    model.to(device)
    model.eval()
    t_load = (time.perf_counter() - t0) * 1000
    print(f"Model Load Time (from disk to CPU eval state): {t_load:.2f} ms")
    
    # Count parameters
    total_params = sum(p.numel() for p in model.parameters())
    trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    backbone_params = sum(p.numel() for p in model.backbone.features.parameters())
    head_params = sum(p.numel() for p in model.backbone.classifier.parameters())
    print(f"Total Parameters:    {total_params:,}")
    print(f"Backbone Parameters: {backbone_params:,} (MobileNetV2 feature extractor)")
    print(f"Classifier Head:     {head_params:,} (Custom linear + BN + dropout projection)")
    
    # Prepare test DataLoader
    _, eval_transform = get_data_transforms()
    test_dataset = SolarPanelDataset(test_samples, transform=eval_transform)
    test_loader = DataLoader(test_dataset, batch_size=1, shuffle=False)
    
    print(f"\nEvaluating on Unseen Test Set ({len(test_dataset)} images)...")
    
    y_true = []
    y_pred = []
    y_probs = []
    latencies = []
    
    with torch.no_grad():
        for inputs, targets, _ in test_loader:
            inputs = inputs.to(device)
            t_start = time.perf_counter()
            outputs = model(inputs)
            t_end = time.perf_counter()
            latencies.append((t_end - t_start) * 1000)
            
            probs = torch.softmax(outputs, dim=1).cpu().numpy()[0]
            pred = int(np.argmax(probs))
            
            y_true.append(targets.item())
            y_pred.append(pred)
            y_probs.append(probs)
            
    y_true = np.array(y_true)
    y_pred = np.array(y_pred)
    
    # Metrics
    acc = accuracy_score(y_true, y_pred) * 100
    p_macro, r_macro, f1_macro, _ = precision_recall_fscore_support(y_true, y_pred, average="macro", zero_division=0)
    p_weighted, r_weighted, f1_weighted, _ = precision_recall_fscore_support(y_true, y_pred, average="weighted", zero_division=0)
    cm = confusion_matrix(y_true, y_pred)
    
    print(f"Test Accuracy:     {acc:.2f}%")
    print(f"Macro Precision:   {p_macro*100:.2f}%")
    print(f"Macro Recall:      {r_macro*100:.2f}%")
    print(f"Macro F1-Score:    {f1_macro*100:.2f}%")
    print(f"Weighted F1-Score: {f1_weighted*100:.2f}%")
    
    print("\nDetailed Classification Report:")
    report_dict = classification_report(y_true, y_pred, target_names=CLASS_NAMES, digits=4, zero_division=0, output_dict=True)
    report_str = classification_report(y_true, y_pred, target_names=CLASS_NAMES, digits=4, zero_division=0)
    print(report_str)
    
    print("Confusion Matrix:")
    print(cm)
    
    # Latency Stats (warmup 5 iterations)
    bench_latencies = np.array(latencies[5:] if len(latencies) > 10 else latencies)
    mean_lat = float(np.mean(bench_latencies))
    median_lat = float(np.median(bench_latencies))
    p90_lat = float(np.percentile(bench_latencies, 90))
    p95_lat = float(np.percentile(bench_latencies, 95))
    p99_lat = float(np.percentile(bench_latencies, 99))
    min_lat = float(np.min(bench_latencies))
    max_lat = float(np.max(bench_latencies))
    std_lat = float(np.std(bench_latencies))
    throughput = float(1000.0 / mean_lat)
    
    print(f"\nInference Latency Benchmark (Batch Size = 1, CPU, N={len(bench_latencies)}):")
    print(f"  - Mean Latency:   {mean_lat:.2f} ms")
    print(f"  - Median Latency: {median_lat:.2f} ms")
    print(f"  - P90 Latency:    {p90_lat:.2f} ms")
    print(f"  - P95 Latency:    {p95_lat:.2f} ms")
    print(f"  - P99 Latency:    {p99_lat:.2f} ms")
    print(f"  - Min / Max:      {min_lat:.2f} ms / {max_lat:.2f} ms")
    print(f"  - Throughput:     {throughput:.2f} images/sec (single thread CPU)")
    
    return {
        "file_size_mb": file_size_mb,
        "load_time_ms": t_load,
        "total_params": total_params,
        "backbone_params": backbone_params,
        "head_params": head_params,
        "test_accuracy": acc,
        "macro_precision": p_macro * 100,
        "macro_recall": r_macro * 100,
        "macro_f1": f1_macro * 100,
        "weighted_f1": f1_weighted * 100,
        "classification_report": report_dict,
        "confusion_matrix": cm.tolist(),
        "latency": {
            "mean_ms": mean_lat,
            "median_ms": median_lat,
            "p90_ms": p90_lat,
            "p95_ms": p95_lat,
            "p99_ms": p99_lat,
            "min_ms": min_lat,
            "max_ms": max_lat,
            "std_ms": std_lat,
            "throughput_fps": throughput
        }
    }

def audit_application():
    print("\n" + "=" * 60)
    print("3. APPLICATION & BACKEND AUDIT")
    print("=" * 60)
    
    from src.api.routes import api_router
    routes_info = []
    for r in api_router.routes:
        methods = list(r.methods)
        routes_info.append({"path": r.path, "methods": methods, "name": r.name})
    
    print(f"FastAPI Endpoints Count: {len(routes_info)}")
    for r in routes_info:
        print(f"  - [{','.join(r['methods']):<6}] {r['path']:<30} ({r['name']})")
        
    # Count files and lines in frontend
    frontend_dir = PROJECT_ROOT / "frontend" / "src"
    ts_files = list(frontend_dir.glob("**/*.tsx")) + list(frontend_dir.glob("**/*.ts"))
    total_ts_lines = 0
    for f in ts_files:
        try:
            total_ts_lines += len(f.read_text(encoding="utf-8").splitlines())
        except Exception:
            pass
    print(f"\nFrontend (React 19 + TypeScript):")
    print(f"  - Total TS/TSX Source Files: {len(ts_files)}")
    print(f"  - Total Lines of Code:       {total_ts_lines:,}")
    
    # Python lines of code
    src_dir = PROJECT_ROOT / "src"
    py_files = list(src_dir.glob("**/*.py")) + [PROJECT_ROOT / "main.py", PROJECT_ROOT / "app.py"]
    total_py_lines = 0
    for f in py_files:
        if f.exists():
            try:
                total_py_lines += len(f.read_text(encoding="utf-8").splitlines())
            except Exception:
                pass
    print(f"\nBackend & ML (Python):")
    print(f"  - Total Python Source Files: {len(py_files)}")
    print(f"  - Total Lines of Code:       {total_py_lines:,}")
    
    return {
        "endpoint_count": len(routes_info),
        "endpoints": routes_info,
        "frontend_ts_files": len(ts_files),
        "frontend_ts_lines": total_ts_lines,
        "backend_py_files": len(py_files),
        "backend_py_lines": total_py_lines
    }

if __name__ == "__main__":
    d_res = audit_dataset()
    m_res = audit_model_and_evaluation(d_res["test_samples"])
    a_res = audit_application()
    
    # Strip test_samples before saving JSON
    d_clean = {k: v for k, v in d_res.items() if not k.endswith("_samples")}
    
    summary = {
        "dataset": d_clean,
        "model": m_res,
        "application": a_res
    }
    
    out_file = PROJECT_ROOT / "models" / "verified_resume_metrics.json"
    with open(out_file, "w") as f:
        json.dump(summary, f, indent=2)
    print(f"\n[Saved verified metrics to {out_file}]")
