"""
AI Prediction and Inference Service for Solar Panel Defect Detection.
Applies exact preprocessing matching training, performs inference,
computes confidence scores, applies uncertainty thresholding,
determines healthy/defective status, and logs records to MongoDB.
"""

import os
import uuid
from datetime import datetime
from typing import Dict, Any, Tuple, Optional
from PIL import Image
import numpy as np
import torch
from torchvision import transforms

from src.ml.dataset import CLASS_NAMES, IMAGENET_MEAN, IMAGENET_STD
from src.ml.model import build_model
from src.database.mongodb import db_manager

# Fault details, action plans, and industrial recommendations
FAULT_METADATA = {
    "Clean": {
        "status": "Healthy",
        "severity": "None",
        "description": "Photovoltaic panel surface is clean, unobstructed, and operating at nominal optical absorption.",
        "action": "No immediate maintenance required. Maintain standard operational monitoring cycle.",
        "risk_level": "Optimal"
    },
    "Dusty": {
        "status": "Defective",
        "severity": "Low to Moderate",
        "description": "Layer of environmental dust or fine particulate matter is obstructing irradiance across cells.",
        "action": "Schedule automated dry-sweeping or demineralized water spray wash to restore up to 15-25% lost yield.",
        "risk_level": "Efficiency Loss"
    },
    "Bird-drop": {
        "status": "Defective",
        "severity": "Moderate to High",
        "description": "Localized organic droppings causing partial shading, localized reverse biasing, and localized thermal hotspot hazard.",
        "action": "Perform immediate localized surface cleaning. Inspect bypass diodes on affected module strings.",
        "risk_level": "Thermal Stress Hazard"
    },
    "Snow-Covered": {
        "status": "Defective",
        "severity": "High",
        "description": "Significant snow or ice accumulation completely blocking sunlight and adding structural mechanical loading.",
        "action": "Deploy thermal de-icing or manual soft-edge squeegee clearing in accordance with manufacturer load limits.",
        "risk_level": "Generation Halt"
    },
    "Electrical-damage": {
        "status": "Defective",
        "severity": "Critical",
        "description": "Thermal hotspot, cell burn mark, delamination, or junction box anomaly detected.",
        "action": "Isolate module immediately. Perform I-V curve tracing and thermal infrared imaging. Replace degraded cell/module.",
        "risk_level": "Fire & Equipment Hazard"
    },
    "Physical-Damage": {
        "status": "Defective",
        "severity": "Critical",
        "description": "Mechanical crack, fractured protective front glass, or micro-fractures detected across silicon wafers.",
        "action": "Lock out affected string to avoid moisture ingress and ground fault trips. Replace damaged module immediately.",
        "risk_level": "Structural Failure"
    }
}

UNCERTAIN_THRESHOLD = float(os.getenv("CONFIDENCE_THRESHOLD", "0.55"))
UPLOAD_DIR = os.path.join("data", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

class InferenceService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(InferenceService, cls).__new__(cls)
            cls._instance.model = None
            cls._instance.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
            cls._instance.model_version = "v2.1.0"
            cls._instance.transform = transforms.Compose([
                transforms.Resize((224, 224)),
                transforms.ToTensor(),
                transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD)
            ])
            cls._instance._load_model()
        return cls._instance

    def _load_model(self, checkpoint_path="models/solar_mobilenet_v2_best.pth"):
        if not os.path.exists(checkpoint_path):
            print(f"[Inference Warning] Checkpoint {checkpoint_path} not found. Model will be loaded on demand.")
            return False

        try:
            model = build_model(num_classes=len(CLASS_NAMES), pretrained=False)
            checkpoint = torch.load(checkpoint_path, map_location=self.device)
            if "model_state_dict" in checkpoint:
                model.load_state_dict(checkpoint["model_state_dict"])
            else:
                model.load_state_dict(checkpoint)
            model.to(self.device)
            model.eval()
            self.model = model
            print(f"[Inference] Loaded model checkpoint from {checkpoint_path} on {self.device}")
            return True
        except Exception as e:
            print(f"[Inference Error] Failed to load checkpoint: {e}")
            self.model = None
            return False

    def reload_model(self, checkpoint_path="models/solar_mobilenet_v2_best.pth"):
        return self._load_model(checkpoint_path)

    def validate_image(self, file_path_or_bytes) -> Tuple[bool, Optional[Image.Image], str]:
        """Validates that uploaded file is an authentic, readable, non-corrupted image."""
        try:
            img = Image.open(file_path_or_bytes)
            img.verify()
            # Reopen after verify
            if hasattr(file_path_or_bytes, "seek"):
                file_path_or_bytes.seek(0)
            img = Image.open(file_path_or_bytes).convert("RGB")
            w, h = img.size
            if w < 50 or h < 50:
                return False, None, "Image resolution too low (minimum 50x50 required)."
            return True, img, "Valid"
        except Exception as e:
            return False, None, f"Invalid or corrupted image: {str(e)}"

    def predict(
        self,
        image_input,
        filename: str = "upload.jpg",
        notes: str = ""
    ) -> Dict[str, Any]:
        """
        Runs complete inference pipeline and logs the result to MongoDB.
        image_input: PIL.Image or path or bytes.
        """
        # Validate
        valid, img, err = self.validate_image(image_input)
        if not valid or img is None:
            raise ValueError(err)

        if self.model is None:
            loaded = self._load_model()
            if not loaded or self.model is None:
                raise RuntimeError("ML model is not loaded or available.")

        # Save uploaded image locally for persistent serving
        timestamp_str = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        unique_id = str(uuid.uuid4())[:8].upper()
        inspection_id = f"INSP-{timestamp_str[:8]}-{unique_id}"
        
        saved_filename = f"{inspection_id}_{filename}"
        saved_path = os.path.join(UPLOAD_DIR, saved_filename)
        img.save(saved_path, format="JPEG", quality=92)

        # Preprocess
        tensor = self.transform(img).unsqueeze(0).to(self.device)

        # Inference
        with torch.no_grad():
            logits = self.model(tensor)
            probs = torch.softmax(logits, dim=1)[0].cpu().numpy()

        class_probabilities = {
            CLASS_NAMES[i]: round(float(probs[i]) * 100, 2)
            for i in range(len(CLASS_NAMES))
        }

        top_idx = int(np.argmax(probs))
        top_class = CLASS_NAMES[top_idx]
        top_confidence = float(probs[top_idx])
        confidence_pct = round(top_confidence * 100, 2)

        # Uncertainty handling
        if top_confidence < UNCERTAIN_THRESHOLD:
            inspection_status = "Uncertain"
            healthy_or_defective = "Uncertain"
            recommendation = (
                f"Prediction confidence ({confidence_pct}%) is below the reliable automated threshold "
                f"({int(UNCERTAIN_THRESHOLD * 100)}%). Manual physical inspection by an onsite technician is required."
            )
            detected_category = f"Uncertain ({top_class})"
            risk_level = "Requires Verification"
        else:
            meta = FAULT_METADATA.get(top_class, {})
            inspection_status = "Healthy" if top_class == "Clean" else "Defective"
            healthy_or_defective = inspection_status
            recommendation = meta.get("action", "Perform inspection.")
            detected_category = top_class
            risk_level = meta.get("risk_level", "Medium")

        # MongoDB inspection document
        inspection_doc = {
            "inspection_id": inspection_id,
            "image_filename": filename,
            "original_image_path": saved_path,
            "annotated_image_path": saved_path, # Standard classification
            "predicted_category": detected_category,
            "raw_class": top_class,
            "class_probabilities": class_probabilities,
            "confidence_score": confidence_pct,
            "inspection_status": inspection_status,
            "healthy_or_defective": healthy_or_defective,
            "risk_level": risk_level,
            "recommendation": recommendation,
            "model_version": self.model_version,
            "inspection_timestamp": datetime.utcnow(),
            "inspection_notes": notes
        }

        # Persist into MongoDB
        try:
            mongo_id = db_manager.insert_inspection(inspection_doc)
            inspection_doc["_id"] = mongo_id
        except Exception as e:
            print(f"[MongoDB Warning] Could not save inspection to database: {e}")

        # Return full prediction payload
        return {
            "inspection_id": inspection_id,
            "predicted_category": detected_category,
            "confidence_score": confidence_pct,
            "healthy_or_defective": healthy_or_defective,
            "inspection_status": inspection_status,
            "risk_level": risk_level,
            "recommendation": recommendation,
            "class_probabilities": class_probabilities,
            "image_path": saved_path,
            "model_version": self.model_version,
            "timestamp": inspection_doc["inspection_timestamp"].strftime("%Y-%m-%d %H:%M:%S UTC")
        }

# Global singleton
inference_service = InferenceService()

