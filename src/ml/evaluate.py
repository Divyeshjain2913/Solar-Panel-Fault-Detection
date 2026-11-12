"""
Model Evaluation and Metrics Computation for Solar Panel Fault Detection.
Generates real Test Accuracy, Precision, Recall, F1-Score, Classification Report,
Confusion Matrix visualization, and persists metadata into MongoDB models collection.
"""

import os
import sys
import json
from datetime import datetime

# Ensure project root is in sys.path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import torch
from sklearn.metrics import classification_report, confusion_matrix, precision_recall_fscore_support, accuracy_score

from src.ml.dataset import prepare_data_splits, create_dataloaders, CLASS_NAMES
from src.ml.model import build_model
from src.database.mongodb import db_manager

MODEL_DIR = "models"
CHECKPOINT_PATH = os.path.join(MODEL_DIR, "solar_mobilenet_v2_best.pth")
CONF_MATRIX_PATH = os.path.join(MODEL_DIR, "confusion_matrix.png")
METRICS_JSON_PATH = os.path.join(MODEL_DIR, "evaluation_metrics.json")

def plot_confusion_matrix(cm, class_names, save_path=CONF_MATRIX_PATH):
    plt.figure(figsize=(9, 7), facecolor="#0B0D10")
    ax = plt.subplot(111)
    ax.set_facecolor("#161A20")

    # Dark-themed heatmap
    sns.heatmap(
        cm,
        annot=True,
        fmt="d",
        cmap="Blues",
        xticklabels=class_names,
        yticklabels=class_names,
        cbar=True,
        annot_kws={"size": 13, "weight": "bold", "color": "#0B0D10"}
    )

    ax.tick_params(colors="#929BA8", labelsize=10)
    plt.xticks(rotation=30, ha="right")
    plt.yticks(rotation=0)

    for spine in ax.spines.values():
        spine.set_color("#262C35")

    plt.title("Solar Panel Fault Detection — Confusion Matrix", color="#F5F7FA", fontsize=15, fontweight="bold", pad=15)
    plt.xlabel("Predicted Class", color="#929BA8", fontsize=12, labelpad=10)
    plt.ylabel("Actual True Class", color="#929BA8", fontsize=12, labelpad=10)

    plt.tight_layout()
    plt.savefig(save_path, dpi=200, bbox_inches="tight")
    plt.close()
    print(f"[Evaluation] Saved confusion matrix visualization to {save_path}")

def run_evaluation(checkpoint_path=CHECKPOINT_PATH, test_loader=None):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"\n==================================================")
    print(f"EVALUATING MODEL ON UNSEEN TEST SET (Device: {device})")
    print(f"==================================================")

    if not os.path.exists(checkpoint_path):
        raise FileNotFoundError(f"Checkpoint not found at {checkpoint_path}")

    # Load test split if loader not passed
    if test_loader is None:
        train_s, val_s, test_s, _ = prepare_data_splits()
        _, _, test_loader = create_dataloaders(train_s, val_s, test_s, batch_size=16)

    # Rebuild model and load weights
    model = build_model(num_classes=len(CLASS_NAMES), pretrained=False)
    checkpoint = torch.load(checkpoint_path, map_location=device)
    model.load_state_dict(checkpoint["model_state_dict"])
    model.to(device)
    model.eval()

    all_preds = []
    all_targets = []
    all_probs = []

    with torch.no_grad():
        for images, labels, _ in test_loader:
            images = images.to(device)
            outputs = model(images)
            probs = torch.softmax(outputs, dim=1)
            _, preds = torch.max(probs, 1)

            all_preds.extend(preds.cpu().numpy())
            all_targets.extend(labels.numpy())
            all_probs.extend(probs.cpu().numpy())

    all_preds = np.array(all_preds)
    all_targets = np.array(all_targets)

    # 1. Accuracy
    acc = accuracy_score(all_targets, all_preds) * 100

    # 2. Precision, Recall, F1
    prec_macro, rec_macro, f1_macro, _ = precision_recall_fscore_support(all_targets, all_preds, average="macro", zero_division=0)
    prec_weighted, rec_weighted, f1_weighted, _ = precision_recall_fscore_support(all_targets, all_preds, average="weighted", zero_division=0)

    # 3. Classification Report
    clf_report = classification_report(
        all_targets,
        all_preds,
        target_names=CLASS_NAMES,
        output_dict=True,
        zero_division=0
    )

    # 4. Confusion Matrix
    cm = confusion_matrix(all_targets, all_preds)
    plot_confusion_matrix(cm, CLASS_NAMES)

    # Print Report
    print(f"\n{'='*55}")
    print(f"MODEL PERFORMANCE SUMMARY (UNSEEN TEST DATA)")
    print(f"{'='*55}")
    print(f"Overall Test Accuracy:     {acc:.2f}%")
    print(f"Macro Precision:           {prec_macro * 100:.2f}%")
    print(f"Macro Recall:              {rec_macro * 100:.2f}%")
    print(f"Macro F1-Score:            {f1_macro * 100:.2f}%")
    print(f"Weighted F1-Score:         {f1_weighted * 100:.2f}%")
    print(f"{'='*55}")
    print("\nDetailed Per-Class Classification Report:")
    print(classification_report(all_targets, all_preds, target_names=CLASS_NAMES, digits=4, zero_division=0))

    # Read training history if exists
    training_history = {}
    history_file = os.path.join(MODEL_DIR, "training_history.json")
    if os.path.exists(history_file):
        with open(history_file, "r") as f:
            training_history = json.load(f)

    # Metrics payload
    metrics_payload = {
        "model_name": "SolarPanel-MobileNetV2-Industrial",
        "model_version": "v2.1.0",
        "architecture": "MobileNetV2 (ImageNet Pretrained Transfer Learning)",
        "training_date": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
        "dataset_information": {
            "dataset_name": "Photovoltaic Panel Defect Classification Dataset",
            "total_samples": len(test_loader.dataset) * 6, # approx
            "classes": CLASS_NAMES,
            "input_resolution": [224, 224, 3],
            "split_ratio": "70% Train, 15% Val, 15% Test (Stratified, Zero-Leakage)"
        },
        "model_path": CHECKPOINT_PATH,
        "evaluation_metrics": {
            "test_accuracy": round(acc, 2),
            "macro_precision": round(prec_macro * 100, 2),
            "macro_recall": round(rec_macro * 100, 2),
            "macro_f1": round(f1_macro * 100, 2),
            "weighted_f1": round(f1_weighted * 100, 2),
            "classification_report": clf_report,
            "confusion_matrix": cm.tolist()
        },
        "training_history": training_history,
        "class_names": CLASS_NAMES,
        "deployment_status": "Active"
    }

    # Save to JSON file
    with open(METRICS_JSON_PATH, "w") as f:
        json.dump(metrics_payload, f, indent=2)
    print(f"[Evaluation] Saved evaluation metrics JSON to {METRICS_JSON_PATH}")

    # Persist into MongoDB models collection
    try:
        db_manager.save_model_record(metrics_payload)
        print("[MongoDB] Active model metadata and test metrics persisted into models collection.")
    except Exception as e:
        print(f"[MongoDB Warning] Could not persist model metadata: {e}")

    return metrics_payload

if __name__ == "__main__":
    run_evaluation()
