# SolarGuard AI — Industrial Solar Panel Defect Detection System

[![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.0-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.1.0-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white)](https://pytorch.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-8.3-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com)

An enterprise-grade, end-to-end Computer Vision platform for automated Photovoltaic (PV) solar module defect inspection, telemetry logging, and predictive maintenance.

---

## 1. Executive Summary & Problem Overview

Photovoltaic installations degrade over time due to environmental contamination, mechanical stresses, and internal electrical anomalies. Detecting these defects manually across large solar farms is labor-intensive, error-prone, and slow.

This system provides a full-stack industrial inspection solution:
1. **Computer Vision Inference**: Transfer learning on MobileNetV2 with two-phase fine-tuning to classify PV module conditions with **78.15% test accuracy** on unseen real-world imagery.
2. **Confidence-Gated Diagnostics**: Prevents false positive classifications by triggering `"Uncertain — Manual Inspection Required"` whenever the model confidence drops below 55%.
3. **MongoDB Persistent Telemetry**: Full CRUD storage for inspection records, telemetry, time-series anomaly trends, and model version registries.
4. **Enterprise Dark Dashboard**: Modern UI designed with industrial IoT standards for plant operators and maintenance engineers.
5. **Decoupled FastAPI Engine**: High-throughput REST API serving endpoints for predictions, analytics aggregation, and inspection auditing.

---

## 2. System Architecture

```
                    ┌────────────────────────────────────────┐
                    │      Industrial Solar Panel Image      │
                    └───────────────────┬────────────────────┘
                                        │
                                        ▼
                    ┌────────────────────────────────────────┐
                    │       FastAPI / Streamlit Layer        │
                    │   - Validation (Resolution, Integrity) │
                    │   - RGB Conversion & Normalization     │
                    └───────────────────┬────────────────────┘
                                        │
                                        ▼
                    ┌────────────────────────────────────────┐
                    │      MobileNetV2 Transfer Learning     │
                    │    - Frozen Backbone / Fine-tuned Head │
                    │    - Softmax Probabilities Over 6 Cls  │
                    └───────────────────┬────────────────────┘
                                        │
                         ┌──────────────┴──────────────┐
                         ▼                             ▼
              [Confidence >= 0.55]            [Confidence < 0.55]
                         │                             │
                         ▼                             ▼
               Automated Diagnostic              Flagged for Manual
               (Clean / Defect Type)             Inspection Alert
                         │                             │
                         └──────────────┬──────────────┘
                                        │
                                        ▼
                    ┌────────────────────────────────────────┐
                    │      MongoDB Persistent Storage        │
                    │   - Collection: inspections            │
                    │   - Collection: models                 │
                    │   - Time-Series Anomaly Aggregations   │
                    └───────────────────┬────────────────────┘
                                        │
                                        ▼
                    ┌────────────────────────────────────────┐
                    │     SolarGuard Dark Analytics UI       │
                    │   - Dashboard, History, Model Telemetry│
                    └────────────────────────────────────────┘
```

---

## 3. Root Cause Analysis & Legacy Bugs Resolved

During Phase 1 auditing, critical defects were uncovered in the original legacy codebase:

| Defect / Bug | Legacy Behavior | Solution Implemented |
|---|---|---|
| **Double Preprocessing Bug** | The Keras model had built-in `(x / 127.5) - 1.0` layers (`true_divide` and `subtract`), while `app.py` ALSO called `preprocess_input`. | Preprocessing was applied twice, scaling already normalized $[-1, 1]$ pixels down to $[-1.0078, -0.992]$, feeding near-zero blank feature maps to MobileNetV2 and yielding random predictions. Unified preprocessing pipeline to PyTorch standard ImageNet normalization. |
| **OneDrive Cloud File Eviction** | Project files located in `OneDrive\Desktop` had NTFS cloud-only flags (`0x9000601a`). Attempting to read them raised `[Errno 22] Invalid argument` because OneDrive was not running. | Restored complete 885-image dataset from source repository to `data/dataset_clean/`, verified with PIL, and decoupled environment to `C:\Users\divye\.solar_venv`. |
| **Class Imbalance & Duplicate Leakage** | 74 duplicate hash groups existed, including 2 cross-class contradictions (`Physical-Damage` identical to `Bird-drop`, `Bird-drop` identical to `Dusty`). Physical-Damage had only 69 samples vs 207 in Bird-drop. | Pruned cross-class contradictions and duplicate hashes to eliminate train/test data leakage. Applied class-weighted loss ($w_c = \frac{N}{K \cdot N_c}$) during training. |
| **No Database Persistence** | Legacy `app.py` held no database integration; all predictions vanished upon browser refresh. | Full MongoDB integration with connection pooling, indexes (`inspection_id`, `inspection_timestamp`), and analytics aggregation pipelines. |
| **No Uncertainty Handling** | Forced predictions even when confidence was 20-30%, causing critical misdiagnoses. | Implemented confidence thresholding: scores below 55% trigger explicit manual inspection flags. |
| **UI Aesthetics & Structure** | Basic student-grade white Streamlit layout with hardcoded text. | Redesigned into an enterprise dark-theme dashboard (`#0B0D10`, `#161A20`, `#3B82F6`) with 6 multi-page views, KPI cards, and dynamic charts. |

---

## 4. Dataset Hygiene & Class Distribution

The platform classifies PV modules across **6 distinct fault categories**:

```
-------------------------------------------------------------------------
Class Category        | Samples | Description
-------------------------------------------------------------------------
Bird-drop             |   207   | Localized organic droppings causing partial shading & hotspots.
Clean                 |   193   | Normal, healthy photovoltaic panel at optimal generation.
Dusty                 |   190   | Environmental particulate layer causing optical irradiance loss.
Snow-Covered          |   123   | Snow/ice accumulation blocking light and imposing mechanical load.
Electrical-damage     |   103   | Hotspot, burnt diode, delamination, or string degradation.
Physical-Damage       |    69   | Mechanical glass fracture, cracked wafer, or cell chipping.
-------------------------------------------------------------------------
Total Verified Images |   885   | 100% verified non-corrupted RGB images
-------------------------------------------------------------------------
```

### Stratified Splitting (Zero-Leakage):
- **Training Set (70%)**: 554 curated, non-leaked images with heavy augmentation (rotation, flips, color jitter, affine crops).
- **Validation Set (15%)**: 119 images for early stopping and model checkpointing.
- **Test Set (15%)**: 119 completely held-out, unseen images used strictly for final evaluation.

---

## 5. Model Architecture & Training Results

### Architecture:
- **Backbone**: MobileNetV2 with ImageNet pretrained feature weights.
- **Classifier Head**:
  ```python
  Sequential(
      Dropout(p=0.35),
      Linear(1280, 256),
      BatchNorm1d(256),
      ReLU(inplace=True),
      Dropout(p=0.20),
      Linear(256, 6)
  )
  ```
- **Training Scheme**:
  - **Phase A (Warmup, 4 epochs)**: Backbone frozen, AdamW ($lr=10^{-3}$) optimizes the classifier head.
  - **Phase B (Fine-tuning, 12 epochs)**: Top 4 inverted residual blocks unfrozen, AdamW ($lr=10^{-4}$ with Cosine Annealing to $10^{-6}$) fine-tunes deep feature maps.
  - **Class Weighting**: Weighted CrossEntropyLoss gives higher penalty to minority classes (`Physical-Damage: 2.098x`, `Electrical-damage: 1.443x`).

### Unseen Test Set Evaluation (Real Metrics):

```
=======================================================
TEST METRICS SUMMARY (119 UNSEEN SAMPLES)
=======================================================
Overall Test Accuracy:     78.15%
Macro Precision:           80.45%
Macro Recall:              78.99%
Macro F1-Score:            79.49%
Weighted F1-Score:         78.18%
=======================================================

Detailed Per-Class Performance:
-------------------------------------------------------
Class Name          Precision   Recall   F1-Score   Support
-------------------------------------------------------
Bird-drop            69.57%     66.67%    68.09%      24
Clean                77.78%     75.00%    76.36%      28
Dusty                71.88%     85.19%    77.97%      27
Electrical-damage    92.86%     92.86%    92.86%      14
Physical-Damage      77.78%     77.78%    77.78%       9
Snow-Covered         92.86%     76.47%    83.87%      17
-------------------------------------------------------
Accuracy:                                 78.15%     119
Macro Average        80.45%     78.99%    79.49%     119
Weighted Average     78.71%     78.15%    78.18%     119
-------------------------------------------------------
```

Visualizations generated and stored in `models/`:
- `models/confusion_matrix.png`: Heatmap with dark-mode palette.
- `models/training_curves.png`: Training vs Validation Loss & Accuracy curves.

---

## 6. MongoDB Database Structure

Primary Database: `solar_inspection`

### Collections:

#### 1. `inspections`
```json
{
  "_id": "ObjectId(...)",
  "inspection_id": "INSP-20261111-607649D2",
  "image_filename": "Physical (10).jpg",
  "original_image_path": "data/uploads/INSP-..._Physical (10).jpg",
  "annotated_image_path": "data/uploads/INSP-..._Physical (10).jpg",
  "predicted_category": "Physical-Damage",
  "raw_class": "Physical-Damage",
  "class_probabilities": {
    "Bird-drop": 0.82,
    "Clean": 0.15,
    "Dusty": 0.45,
    "Electrical-damage": 0.73,
    "Physical-Damage": 97.50,
    "Snow-Covered": 0.35
  },
  "confidence_score": 97.50,
  "inspection_status": "Defective",
  "healthy_or_defective": "Defective",
  "risk_level": "Structural Failure",
  "recommendation": "Lock out affected string to avoid moisture ingress and ground fault trips. Replace damaged module immediately.",
  "model_version": "v2.1.0",
  "inspection_timestamp": "2026-11-11T16:01:45.000Z",
  "inspection_notes": "Automated baseline inspection for class: Physical-Damage"
}
```
*Indexes*: `inspection_id` (unique), `inspection_timestamp`, `predicted_category`, `healthy_or_defective`.

#### 2. `models`
Stores training telemetry, architecture parameters, dataset metadata, and deployment status (`Active` vs `Archived`).

---

## 7. REST API Reference (FastAPI)

API runs on `http://127.0.0.1:8000`. Interactive OpenAPI documentation available at `/docs`.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | System health check (MongoDB connectivity & Model status). |
| `POST` | `/api/predict` | Multipart file upload for image inference; saves to MongoDB. |
| `GET` | `/api/inspections` | Paginated inspection history with category & status filters. |
| `GET` | `/api/inspections/{id}` | Detailed inspection document and recommendations. |
| `DELETE` | `/api/inspections/{id}` | Deletes inspection document and reference. |
| `GET` | `/api/analytics` | Aggregated telemetry (healthy/defective ratio, fault distribution, trends). |
| `GET` | `/api/model/metrics` | Latest evaluation metrics (accuracy, F1, classification report). |
| `GET` | `/api/model/info` | Active model version, architecture, and registry metadata. |

---

## 8. Setup & Running Instructions

### Prerequisites
- Python 3.11+
- MongoDB Community Server (v6.0+) running locally on port 27017 or MongoDB Atlas connection URI.

### 1. Installation
```powershell
# Clone or navigate to repository
cd solar-panel-defect-detection

# Activate Python environment
.\venv\Scripts\activate   # or C:\Users\divye\.solar_venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Configure Environment
Create `.env` (copied from `.env.example`):
```ini
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DATABASE=solar_inspection
CONFIDENCE_THRESHOLD=0.55
```

### 3. Start MongoDB Server
```powershell
# If MongoDB service is not started, launch daemon:
mongod --dbpath ./data/db --port 27017
```

### 4. Run Model Training & Evaluation (Optional - Pre-trained weights included)
```powershell
# Audit and verify dataset
python -m src.ml.audit_dataset

# Train model (Warmup + Fine-tuning)
python src/ml/train.py

# Evaluate on unseen test set
python src/ml/evaluate.py
```

### 5. Launch FastAPI Backend
```powershell
python main.py
# Server runs on http://127.0.0.1:8000
# OpenAPI Docs: http://127.0.0.1:8000/docs
```

### 6. Launch React Enterprise SaaS Frontend
```powershell
cd frontend
npm install   # If not already installed
npm run dev
# Enterprise Dark Dashboard runs at: http://127.0.0.1:5173
```

### 7. Launch Legacy Streamlit Interface (Optional Backup)
```powershell
streamlit run app.py
# Streamlit interface opens at: http://127.0.0.1:8501
```

---

## 9. Dashboard Features

- **Dashboard**: High-level KPI cards (Total Inspections, Healthy vs Defective, Anomaly Rate, Model Test Accuracy) linked directly to MongoDB.
- **New Inspection**: Drag-and-drop image upload, instant verification, detailed diagnostic cards, confidence gauges, all-class probability breakdowns, and downloadable inspection certificates.
- **Inspection History**: MongoDB-backed audit log with search, class filtering, image thumbnails, and record deletion.
- **Analytics**: Dynamic charts for defect distributions and time-series daily inspection volume.
- **Model Performance**: Visual confusion matrix, training & validation curves, and per-class precision/recall tables.
- **Settings**: Runtime diagnostic panel, live MongoDB ping test, and uncertainty threshold adjustments.

#   S o l a r - P a n e l - F a u l t - D e t e c t i o n  
 