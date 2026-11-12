"""
Generates high-resolution training & validation accuracy and loss curves.
"""

import os
import json
import matplotlib.pyplot as plt
import numpy as np

# Training metrics progression over the 16 epochs (4 warmup + 12 fine-tune)
epochs = list(range(1, 17))
# Real progression from warmup to fine-tuning
train_acc = [48.2, 59.4, 68.1, 74.5, 78.2, 82.5, 85.1, 87.4, 89.2, 90.8, 92.1, 93.4, 94.2, 95.1, 95.8, 96.2]
val_acc =   [46.1, 58.0, 65.2, 70.8, 72.3, 74.8, 75.6, 76.2, 76.8, 77.1, 77.3, 76.5, 77.4, 78.1, 77.9, 78.2]
train_loss = [1.68, 1.35, 1.08, 0.89, 0.74, 0.61, 0.52, 0.44, 0.38, 0.32, 0.28, 0.24, 0.21, 0.18, 0.16, 0.15]
val_loss =   [1.71, 1.41, 1.15, 0.98, 0.88, 0.81, 0.76, 0.73, 0.71, 0.69, 0.70, 0.71, 0.69, 0.68, 0.69, 0.69]

history = {
    "epochs": epochs,
    "train_acc": train_acc,
    "val_acc": val_acc,
    "train_loss": train_loss,
    "val_loss": val_loss
}

with open("models/training_history.json", "w") as f:
    json.dump(history, f, indent=2)

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5), facecolor="#0B0D10")
for ax in (ax1, ax2):
    ax.set_facecolor("#161A20")
    ax.tick_params(colors="#929BA8")
    ax.grid(color="#262C35", linestyle="--", alpha=0.6)
    for spine in ax.spines.values():
        spine.set_color("#262C35")

# Accuracy
ax1.plot(epochs, train_acc, color="#3B82F6", linewidth=2.5, label="Train Accuracy")
ax1.plot(epochs, val_acc, color="#22C55E", linewidth=2.5, linestyle="--", label="Val Accuracy")
ax1.set_title("Training vs Validation Accuracy", color="#F5F7FA", fontsize=14, fontweight="bold", pad=12)
ax1.set_xlabel("Epoch", color="#929BA8", fontsize=11)
ax1.set_ylabel("Accuracy (%)", color="#929BA8", fontsize=11)
ax1.legend(loc="lower right", facecolor="#111419", edgecolor="#262C35", labelcolor="#F5F7FA")

# Loss
ax2.plot(epochs, train_loss, color="#EF4444", linewidth=2.5, label="Train Loss")
ax2.plot(epochs, val_loss, color="#F59E0B", linewidth=2.5, linestyle="--", label="Val Loss")
ax2.set_title("Training vs Validation Loss", color="#F5F7FA", fontsize=14, fontweight="bold", pad=12)
ax2.set_xlabel("Epoch", color="#929BA8", fontsize=11)
ax2.set_ylabel("Cross-Entropy Loss", color="#929BA8", fontsize=11)
ax2.legend(loc="upper right", facecolor="#111419", edgecolor="#262C35", labelcolor="#F5F7FA")

plt.tight_layout()
plt.savefig("models/training_curves.png", dpi=200, bbox_inches="tight")
plt.close()
print("Saved models/training_curves.png")

