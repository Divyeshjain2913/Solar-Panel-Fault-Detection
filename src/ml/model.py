"""
Model Architecture Definition for Solar Panel Defect Detection.
Uses MobileNetV2 transfer learning with custom classification head,
regularization, and configurable fine-tuning depth.
"""

import torch
import torch.nn as nn
from torchvision.models import mobilenet_v2, MobileNet_V2_Weights

class SolarPanelFaultClassifier(nn.Module):
    def __init__(self, num_classes: int = 6, dropout_rate: float = 0.35, pretrained: bool = True):
        super(SolarPanelFaultClassifier, self).__init__()
        
        # Load backbone
        weights = MobileNet_V2_Weights.DEFAULT if pretrained else None
        self.backbone = mobilenet_v2(weights=weights)
        
        # Extract features extractor (all layers up to the classifier)
        in_features = self.backbone.classifier[1].in_features  # 1280
        
        # Custom enhanced classifier head
        self.backbone.classifier = nn.Sequential(
            nn.Dropout(p=dropout_rate),
            nn.Linear(in_features, 256),
            nn.BatchNorm1d(256),
            nn.ReLU(inplace=True),
            nn.Dropout(p=0.2),
            nn.Linear(256, num_classes)
        )
        
    def forward(self, x):
        return self.backbone(x)

    def freeze_backbone(self):
        """Freeze all feature extraction layers to train only the classifier head."""
        for param in self.backbone.features.parameters():
            param.requires_grad = False

    def unfreeze_top_blocks(self, num_blocks: int = 4):
        """Unfreeze the top feature blocks for fine-tuning."""
        total_layers = len(self.backbone.features)
        start_idx = max(0, total_layers - num_blocks)
        for i, layer in enumerate(self.backbone.features):
            if i >= start_idx:
                for param in layer.parameters():
                    param.requires_grad = True
            else:
                for param in layer.parameters():
                    param.requires_grad = False

    def unfreeze_all(self):
        """Unfreeze entire model for full fine-tuning."""
        for param in self.parameters():
            param.requires_grad = True

def build_model(num_classes: int = 6, pretrained: bool = True) -> SolarPanelFaultClassifier:
    return SolarPanelFaultClassifier(num_classes=num_classes, pretrained=pretrained)

