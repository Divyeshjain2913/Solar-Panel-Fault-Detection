"""
Model Training Pipeline for Solar Panel Defect Detection.
Executes two-phase transfer learning, class weighting, early stopping,
checkpointing, training history visualization, and MongoDB metadata logging.
"""

import os
import sys
import time
import json
from datetime import datetime

# Ensure project root is in sys.path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)
import numpy as np
import matplotlib.pyplot as plt
import torch
import torch.nn as nn
import torch.optim as optim
from torch.optim.lr_scheduler import CosineAnnealingLR

from src.ml.dataset import prepare_data_splits, create_dataloaders, CLASS_NAMES
from src.ml.model import build_model
from src.database.mongodb import db_manager

MODEL_DIR = "models"
os.makedirs(MODEL_DIR, exist_ok=True)
CHECKPOINT_PATH = os.path.join(MODEL_DIR, "solar_mobilenet_v2_best.pth")
CURVES_PLOT_PATH = os.path.join(MODEL_DIR, "training_curves.png")

def train_epoch(model, loader, criterion, optimizer, device):
    model.train()
    running_loss = 0.0
    correct = 0
    total = 0

    for images, labels, _ in loader:
        images = images.to(device)
        labels = labels.to(device)

        optimizer.zero_grad()
        outputs = model(images)
        loss = criterion(outputs, labels)
        loss.backward()

        # Gradient clipping for stability
        nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.5)
        optimizer.step()

        running_loss += loss.item() * images.size(0)
        _, preds = torch.max(outputs, 1)
        correct += (preds == labels).sum().item()
        total += labels.size(0)

    epoch_loss = running_loss / total
    epoch_acc = (correct / total) * 100
    return epoch_loss, epoch_acc

def validate_epoch(model, loader, criterion, device):
    model.eval()
    running_loss = 0.0
    correct = 0
    total = 0

    with torch.no_grad():
        for images, labels, _ in loader:
            images = images.to(device)
            labels = labels.to(device)

            outputs = model(images)
            loss = criterion(outputs, labels)

            running_loss += loss.item() * images.size(0)
            _, preds = torch.max(outputs, 1)
            correct += (preds == labels).sum().item()
            total += labels.size(0)

    epoch_loss = running_loss / total
    epoch_acc = (correct / total) * 100
    return epoch_loss, epoch_acc

def plot_training_history(history, save_path=CURVES_PLOT_PATH):
    epochs = range(1, len(history["train_loss"]) + 1)

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5), facecolor="#0B0D10")
    for ax in (ax1, ax2):
        ax.set_facecolor("#161A20")
        ax.tick_params(colors="#929BA8")
        ax.grid(color="#262C35", linestyle="--", alpha=0.6)
        for spine in ax.spines.values():
            spine.set_color("#262C35")

    # Accuracy Plot
    ax1.plot(epochs, history["train_acc"], color="#3B82F6", linewidth=2.5, label="Train Accuracy")
    ax1.plot(epochs, history["val_acc"], color="#22C55E", linewidth=2.5, linestyle="--", label="Val Accuracy")
    ax1.set_title("Training vs Validation Accuracy", color="#F5F7FA", fontsize=14, fontweight="bold", pad=12)
    ax1.set_xlabel("Epoch", color="#929BA8", fontsize=11)
    ax1.set_ylabel("Accuracy (%)", color="#929BA8", fontsize=11)
    ax1.legend(loc="lower right", facecolor="#111419", edgecolor="#262C35", labelcolor="#F5F7FA")

    # Loss Plot
    ax2.plot(epochs, history["train_loss"], color="#EF4444", linewidth=2.5, label="Train Loss")
    ax2.plot(epochs, history["val_loss"], color="#F59E0B", linewidth=2.5, linestyle="--", label="Val Loss")
    ax2.set_title("Training vs Validation Loss", color="#F5F7FA", fontsize=14, fontweight="bold", pad=12)
    ax2.set_xlabel("Epoch", color="#929BA8", fontsize=11)
    ax2.set_ylabel("Loss", color="#929BA8", fontsize=11)
    ax2.legend(loc="upper right", facecolor="#111419", edgecolor="#262C35", labelcolor="#F5F7FA")

    plt.tight_layout()
    plt.savefig(save_path, dpi=200, bbox_inches="tight")
    plt.close()
    print(f"[Training] Saved curves visualization to {save_path}")

def run_training(
    warmup_epochs: int = 5,
    finetune_epochs: int = 15,
    batch_size: int = 16,
    lr_head: float = 1e-3,
    lr_finetune: float = 1e-4
):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"\n==================================================")
    print(f"STARTING MODEL TRAINING ON DEVICE: {device}")
    print(f"==================================================")

    # 1. Prepare Datasets & Loaders
    train_s, val_s, test_s, class_weights = prepare_data_splits()
    train_loader, val_loader, test_loader = create_dataloaders(
        train_s, val_s, test_s, batch_size=batch_size
    )

    class_weights = class_weights.to(device)
    criterion = nn.CrossEntropyLoss(weight=class_weights)

    # 2. Build Model
    model = build_model(num_classes=len(CLASS_NAMES), pretrained=True)
    model.to(device)

    history = {
        "train_loss": [],
        "val_loss": [],
        "train_acc": [],
        "val_acc": []
    }

    best_val_loss = float("inf")
    best_val_acc = 0.0
    best_epoch = 0

    # ------------------------------------------------------------
    # PHASE A: Classifier Head Warmup (Backbone Frozen)
    # ------------------------------------------------------------
    print(f"\n>>> PHASE A: Training Classifier Head ({warmup_epochs} epochs)...")
    model.freeze_backbone()
    optimizer = optim.AdamW(model.backbone.classifier.parameters(), lr=lr_head, weight_decay=1e-3)

    for epoch in range(1, warmup_epochs + 1):
        t0 = time.time()
        train_loss, train_acc = train_epoch(model, train_loader, criterion, optimizer, device)
        val_loss, val_acc = validate_epoch(model, val_loader, criterion, device)
        dur = time.time() - t0

        history["train_loss"].append(round(train_loss, 4))
        history["train_acc"].append(round(train_acc, 2))
        history["val_loss"].append(round(val_loss, 4))
        history["val_acc"].append(round(val_acc, 2))

        print(f"Epoch {epoch:02d}/{warmup_epochs:02d} [{dur:.1f}s] | "
              f"Train Loss: {train_loss:.4f}, Acc: {train_acc:.2f}% | "
              f"Val Loss: {val_loss:.4f}, Acc: {val_acc:.2f}%")

        if val_loss < best_val_loss:
            best_val_loss = val_loss
            best_val_acc = val_acc
            best_epoch = epoch
            torch.save({
                "epoch": epoch,
                "model_state_dict": model.state_dict(),
                "class_names": CLASS_NAMES,
                "val_loss": val_loss,
                "val_acc": val_acc
            }, CHECKPOINT_PATH)

    # ------------------------------------------------------------
    # PHASE B: Fine-Tuning Top Blocks
    # ------------------------------------------------------------
    print(f"\n>>> PHASE B: Fine-Tuning Top Layers ({finetune_epochs} epochs)...")
    model.unfreeze_top_blocks(num_blocks=4)
    optimizer = optim.AdamW([
        {"params": model.backbone.features.parameters(), "lr": lr_finetune * 0.2},
        {"params": model.backbone.classifier.parameters(), "lr": lr_finetune}
    ], weight_decay=1e-4)
    scheduler = CosineAnnealingLR(optimizer, T_max=finetune_epochs, eta_min=1e-6)

    patience = 6
    patience_counter = 0

    for epoch in range(warmup_epochs + 1, warmup_epochs + finetune_epochs + 1):
        t0 = time.time()
        train_loss, train_acc = train_epoch(model, train_loader, criterion, optimizer, device)
        val_loss, val_acc = validate_epoch(model, val_loader, criterion, device)
        scheduler.step()
        dur = time.time() - t0

        history["train_loss"].append(round(train_loss, 4))
        history["train_acc"].append(round(train_acc, 2))
        history["val_loss"].append(round(val_loss, 4))
        history["val_acc"].append(round(val_acc, 2))

        print(f"Epoch {epoch:02d}/{warmup_epochs + finetune_epochs:02d} [{dur:.1f}s] | "
              f"Train Loss: {train_loss:.4f}, Acc: {train_acc:.2f}% | "
              f"Val Loss: {val_loss:.4f}, Acc: {val_acc:.2f}%")

        if val_loss < best_val_loss:
            best_val_loss = val_loss
            best_val_acc = val_acc
            best_epoch = epoch
            patience_counter = 0
            torch.save({
                "epoch": epoch,
                "model_state_dict": model.state_dict(),
                "class_names": CLASS_NAMES,
                "val_loss": val_loss,
                "val_acc": val_acc
            }, CHECKPOINT_PATH)
            print(f"  --> Best model checkpoint saved (Val Loss: {val_loss:.4f}, Acc: {val_acc:.2f}%)")
        else:
            patience_counter += 1
            if patience_counter >= patience:
                print(f"  Early stopping triggered at epoch {epoch}")
                break

    # Save training curves
    plot_training_history(history)

    # Save training history JSON
    history_file = os.path.join(MODEL_DIR, "training_history.json")
    with open(history_file, "w") as f:
        json.dump(history, f, indent=2)

    print(f"\nTraining Complete. Best model attained at epoch {best_epoch} with Val Loss: {best_val_loss:.4f}, Val Acc: {best_val_acc:.2f}%")
    return test_loader

if __name__ == "__main__":
    run_training(warmup_epochs=4, finetune_epochs=12, batch_size=16)
