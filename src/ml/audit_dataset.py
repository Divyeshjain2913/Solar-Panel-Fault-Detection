"""
Dataset Audit Script for Solar Panel Defect Detection System.
Performs verification of:
1. File formats and integrity (identifying corrupted images).
2. Image dimensions, modes, and statistics.
3. Duplicate detection across classes and splits (MD5 hashing).
4. Class distribution and imbalance analysis.
5. Evaluation of train/val/test splits and data leakage.
"""

import os
import hashlib
from collections import defaultdict
from PIL import Image

DATA_DIR = "data"

def get_image_hash(filepath):
    hasher = hashlib.md5()
    with open(filepath, "rb") as f:
        buf = f.read(65536)
        while len(buf) > 0:
            hasher.update(buf)
            buf = f.read(65536)
    return hasher.hexdigest()

def audit_directory(base_dir):
    print(f"\n==================================================")
    print(f"AUDITING DATASET DIRECTORY: {base_dir}")
    print(f"==================================================")
    
    if not os.path.exists(base_dir):
        print(f"Error: Directory {base_dir} does not exist.")
        return None
        
    class_counts = defaultdict(int)
    corrupted_files = []
    dimensions = []
    modes = defaultdict(int)
    file_hashes = defaultdict(list)
    total_images = 0
    non_image_files = []
    
    for root, dirs, files in os.walk(base_dir):
        # Determine class name based on directory structure
        rel_path = os.path.relpath(root, base_dir)
        parts = rel_path.split(os.sep)
        class_name = parts[0] if parts and parts[0] != "." else "root"
        
        for file in files:
            filepath = os.path.join(root, file)
            ext = os.path.splitext(file)[1].lower()
            if ext not in [".jpg", ".jpeg", ".png", ".bmp", ".webp"]:
                non_image_files.append(filepath)
                continue
                
            total_images += 1
            class_counts[class_name] += 1
            
            # Check for corruption and verify dimensions
            try:
                with Image.open(filepath) as img:
                    img.verify()
                # Reopen to read dimensions and mode since verify() can close or invalidate
                with Image.open(filepath) as img:
                    w, h = img.size
                    dimensions.append((w, h))
                    modes[img.mode] += 1
                    
                # Calculate hash for duplicate detection
                img_hash = get_image_hash(filepath)
                file_hashes[img_hash].append((class_name, filepath))
            except Exception as e:
                corrupted_files.append((filepath, str(e)))
                
    print(f"\nTotal image files scanned: {total_images}")
    print(f"Non-image files detected: {len(non_image_files)}")
    print(f"Corrupted images detected: {len(corrupted_files)}")
    if corrupted_files:
        for f, err in corrupted_files:
            print(f"  - Corrupt: {f} (Error: {err})")
            
    print("\nClass Distribution:")
    for cls, count in sorted(class_counts.items(), key=lambda x: x[1], reverse=True):
        pct = (count / total_images * 100) if total_images > 0 else 0
        print(f"  - {cls:<20}: {count:>4} images ({pct:5.1f}%)")
        
    print("\nColor Modes:")
    for mode, count in modes.items():
        print(f"  - {mode}: {count} images")
        
    if dimensions:
        widths, heights = zip(*dimensions)
        min_w, max_w = min(widths), max(widths)
        min_h, max_h = min(heights), max(heights)
        avg_w = sum(widths) / len(widths)
        avg_h = sum(heights) / len(heights)
        print(f"\nResolution Summary:")
        print(f"  - Width range:  [{min_w}, {max_w}], average: {avg_w:.1f}px")
        print(f"  - Height range: [{min_h}, {max_h}], average: {avg_h:.1f}px")
        
    # Duplicates check
    duplicates = {h: paths for h, paths in file_hashes.items() if len(paths) > 1}
    print(f"\nDuplicate Image Hash Groups: {len(duplicates)}")
    cross_class_dupes = []
    within_class_dupes = []
    for h, items in duplicates.items():
        classes_in_dupe = set(c for c, p in items)
        if len(classes_in_dupe) > 1:
            cross_class_dupes.append((classes_in_dupe, items))
        else:
            within_class_dupes.append(items)
            
    print(f"  - Identical duplicates within same class: {len(within_class_dupes)}")
    print(f"  - Conflicting duplicates across classes: {len(cross_class_dupes)}")
    if cross_class_dupes:
        for clss, items in cross_class_dupes[:5]:
            print(f"    * Conflict between classes {clss}:")
            for c, p in items:
                print(f"        [{c}] {p}")
                
    return {
        "total": total_images,
        "class_counts": dict(class_counts),
        "corrupted": corrupted_files,
        "duplicates": len(duplicates),
        "cross_class_dupes": len(cross_class_dupes)
    }

def check_split_leakage(train_dir, val_dir, test_dir):
    print("\n==================================================")
    print("CHECKING TRAIN/VAL/TEST DATA LEAKAGE")
    print("==================================================")
    
    def get_hashes(directory):
        hashes = {}
        for root, _, files in os.walk(directory):
            for f in files:
                ext = os.path.splitext(f)[1].lower()
                if ext in [".jpg", ".jpeg", ".png", ".bmp", ".webp"]:
                    path = os.path.join(root, f)
                    try:
                        h = get_image_hash(path)
                        hashes[h] = path
                    except Exception:
                        pass
        return hashes

    train_h = get_hashes(train_dir)
    val_h = get_hashes(val_dir)
    test_h = get_hashes(test_dir)
    
    train_val_leak = set(train_h.keys()) & set(val_h.keys())
    train_test_leak = set(train_h.keys()) & set(test_h.keys())
    val_test_leak = set(val_h.keys()) & set(test_h.keys())
    
    print(f"Train images: {len(train_h)}")
    print(f"Val images:   {len(val_h)}")
    print(f"Test images:  {len(test_h)}")
    print(f"Train-Val Leakage:   {len(train_val_leak)} shared identical images")
    print(f"Train-Test Leakage:  {len(train_test_leak)} shared identical images")
    print(f"Val-Test Leakage:    {len(val_test_leak)} shared identical images")
    
    if train_test_leak:
        for h in list(train_test_leak)[:3]:
            print(f"  Leak between Train ({train_h[h]}) and Test ({test_h[h]})")

if __name__ == "__main__":
    audit_directory("data/dataset_orignal")
    audit_directory("data/train")
    check_split_leakage("data/train", "data/val", "data/test")

