"""
Dataset Loading, Deduplication, and Stratified Splitting Module.
Ensures zero data leakage between splits, handles class imbalance,
and applies optimal augmentations for solar panel defect detection.
"""

import os
import hashlib
from collections import defaultdict
from typing import Dict, List, Tuple
from PIL import Image
import torch
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms
from sklearn.model_selection import train_test_split

CLASS_NAMES = [
    "Bird-drop",
    "Clean",
    "Dusty",
    "Electrical-damage",
    "Physical-Damage",
    "Snow-Covered"
]

IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]

def compute_md5(filepath: str) -> str:
    hasher = hashlib.md5()
    with open(filepath, "rb") as f:
        buf = f.read(65536)
        while len(buf) > 0:
            hasher.update(buf)
            buf = f.read(65536)
    return hasher.hexdigest()

class SolarPanelDataset(Dataset):
    def __init__(self, samples: List[Tuple[str, int]], transform=None):
        self.samples = samples
        self.transform = transform

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        path, label = self.samples[idx]
        with Image.open(path) as img:
            img = img.convert("RGB")
            if self.transform:
                img = self.transform(img)
        return img, label, path

def prepare_data_splits(
    data_dir: str = "data/dataset_clean",
    test_size: float = 0.15,
    val_size: float = 0.15,
    random_state: int = 42
):
    """
    Curates dataset by removing contradictory cross-class duplicates,
    deduping within classes, and generating strict stratified splits.
    """
    # 1. Index all valid images by hash
    hash_to_samples = defaultdict(list)
    for class_idx, class_name in enumerate(CLASS_NAMES):
        class_folder = os.path.join(data_dir, class_name)
        if not os.path.exists(class_folder):
            continue
        for root, _, files in os.walk(class_folder):
            for f in files:
                ext = os.path.splitext(f)[1].lower()
                if ext in [".jpg", ".jpeg", ".png", ".bmp"]:
                    filepath = os.path.join(root, f)
                    try:
                        h = compute_md5(filepath)
                        hash_to_samples[h].append((filepath, class_idx, class_name))
                    except Exception:
                        pass

    # 2. Filter contradictory duplicates (same hash assigned to different classes)
    curated_samples = []
    contradictions = 0
    internal_dupes = 0
    for h, items in hash_to_samples.items():
        classes = set(item[1] for item in items)
        if len(classes) > 1:
            contradictions += 1
            continue  # Drop contradictory samples for data hygiene
        # Keep only 1 unique representative per hash to guarantee zero split leakage
        if len(items) > 1:
            internal_dupes += (len(items) - 1)
        curated_samples.append((items[0][0], items[0][1]))

    print(f"[Dataset Preparation]")
    print(f"  - Total unique image hashes: {len(curated_samples)}")
    print(f"  - Pruned within-class duplicates: {internal_dupes}")
    print(f"  - Pruned contradictory duplicates: {contradictions}")

    # 3. Stratified split: Train (70%), Val (15%), Test (15%)
    filepaths = [s[0] for s in curated_samples]
    labels = [s[1] for s in curated_samples]

    train_files, temp_files, train_labels, temp_labels = train_test_split(
        filepaths, labels,
        test_size=(test_size + val_size),
        stratify=labels,
        random_state=random_state
    )

    relative_test_size = test_size / (test_size + val_size)
    val_files, test_files, val_labels, test_labels = train_test_split(
        temp_files, temp_labels,
        test_size=relative_test_size,
        stratify=temp_labels,
        random_state=random_state
    )

    train_samples = list(zip(train_files, train_labels))
    val_samples = list(zip(val_files, val_labels))
    test_samples = list(zip(test_files, test_labels))

    print(f"  - Train set size: {len(train_samples)}")
    print(f"  - Val set size:   {len(val_samples)}")
    print(f"  - Test set size:  {len(test_samples)}")

    # Calculate class counts and class weights
    class_counts = defaultdict(int)
    for _, lbl in train_samples:
        class_counts[lbl] += 1

    total_train = len(train_samples)
    num_classes = len(CLASS_NAMES)
    class_weights = []
    print("\n[Train Set Distribution & Balancing Weights]")
    for i in range(num_classes):
        cnt = class_counts.get(i, 1)
        # Standard balanced weight formula: N / (K * Nc)
        weight = total_train / (num_classes * cnt)
        class_weights.append(weight)
        cname = CLASS_NAMES[i]
        print(f"  - {cname:<20}: {cnt:>3} samples | Weight: {weight:.3f}")

    return train_samples, val_samples, test_samples, torch.FloatTensor(class_weights)

def get_data_transforms():
    train_transform = transforms.Compose([
        transforms.Resize((240, 240)),
        transforms.RandomCrop((224, 224)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomVerticalFlip(p=0.2),
        transforms.RandomRotation(degrees=15),
        transforms.ColorJitter(brightness=0.15, contrast=0.15, saturation=0.1),
        transforms.ToTensor(),
        transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD)
    ])

    eval_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD)
    ])

    return train_transform, eval_transform

def create_dataloaders(
    train_samples,
    val_samples,
    test_samples,
    batch_size: int = 16,
    num_workers: int = 0
):
    train_tf, eval_tf = get_data_transforms()

    train_dataset = SolarPanelDataset(train_samples, transform=train_tf)
    val_dataset = SolarPanelDataset(val_samples, transform=eval_tf)
    test_dataset = SolarPanelDataset(test_samples, transform=eval_tf)

    train_loader = DataLoader(
        train_dataset,
        batch_size=batch_size,
        shuffle=True,
        num_workers=num_workers,
        pin_memory=False
    )

    val_loader = DataLoader(
        val_dataset,
        batch_size=batch_size,
        shuffle=False,
        num_workers=num_workers,
        pin_memory=False
    )

    test_loader = DataLoader(
        test_dataset,
        batch_size=batch_size,
        shuffle=False,
        num_workers=num_workers,
        pin_memory=False
    )

    return train_loader, val_loader, test_loader

