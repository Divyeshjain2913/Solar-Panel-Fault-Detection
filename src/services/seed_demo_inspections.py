"""
Seeds initial inspection records into MongoDB from real dataset samples.
Ensures the dashboard and analytics immediately reflect real industrial inspection telemetry.
"""

import os
import sys

# Ensure root in sys.path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from src.services.inference_service import inference_service
from src.ml.dataset import CLASS_NAMES
from src.database.mongodb import db_manager

def seed_inspections(num_per_class: int = 2):
    print("\n[Seeding Initial Inspections into MongoDB]")
    base_dir = "data/dataset_clean"
    total_seeded = 0

    for cname in CLASS_NAMES:
        folder = os.path.join(base_dir, cname)
        if not os.path.exists(folder):
            continue
        files = [f for f in os.listdir(folder) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
        for f in files[:num_per_class]:
            path = os.path.join(folder, f)
            try:
                with open(path, "rb") as fp:
                    res = inference_service.predict(
                        image_input=fp,
                        filename=f,
                        notes=f"Automated baseline inspection for class: {cname}"
                    )
                    print(f"  + Seeded {res['inspection_id']}: {res['predicted_category']} ({res['confidence_score']}%) [{res['healthy_or_defective']}]")
                    total_seeded += 1
            except Exception as e:
                print(f"  - Error seeding {path}: {e}")

    # Also seed active model metrics into models collection
    metrics_path = os.path.join(PROJECT_ROOT, "models", "evaluation_metrics.json")
    if os.path.exists(metrics_path):
        import json
        with open(metrics_path, "r") as mf:
            mdata = json.load(mf)
            mdata["deployment_status"] = "Active"
            db_manager.save_model_record(mdata)
            print(f"  + Seeded active model {mdata.get('model_version')} into models collection")

    summary = db_manager.get_analytics_summary()
    print(f"\nSeeding complete. Total in DB: {summary['total_inspections']} | Healthy: {summary['healthy_panels']} | Defective: {summary['defective_panels']}")

if __name__ == "__main__":
    seed_inspections(num_per_class=2)
