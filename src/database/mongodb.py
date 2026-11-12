"""
MongoDB Database Management Module for Solar Panel Fault Detection System.
Provides connection pooling, collection indexing, CRUD operations, and aggregation analytics.
"""

import os
from datetime import datetime
from typing import Dict, Any, List, Optional
import pymongo
from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.errors import ConnectionFailure, PyMongoError
from dotenv import load_dotenv

# Load environment configuration
load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://127.0.0.1:27017")
MONGODB_DATABASE = os.getenv("MONGODB_DATABASE", "solar_inspection")

class MongoDBManager:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(MongoDBManager, cls).__new__(cls)
            cls._instance._client = None
            cls._instance._db = None
        return cls._instance

    def connect(self, uri: Optional[str] = None, db_name: Optional[str] = None):
        """Establish connection to MongoDB and ensure indexes."""
        uri = uri or MONGODB_URI
        db_name = db_name or MONGODB_DATABASE

        try:
            self._client = MongoClient(uri, serverSelectionTimeoutMS=3000)
            # Trigger server selection to verify connectivity
            self._client.admin.command('ping')
            self._db = self._client[db_name]
            self._create_indexes()
            return True
        except ConnectionFailure as e:
            print(f"[MongoDB Warning] Could not connect to MongoDB at {uri}: {e}")
            self._client = None
            self._db = None
            return False

    def is_connected(self) -> bool:
        if self._client is None or self._db is None:
            return False
        try:
            self._client.admin.command('ping')
            return True
        except Exception:
            return False

    def get_db(self):
        if not self.is_connected():
            self.connect()
        return self._db

    def _create_indexes(self):
        """Create required indexes for efficient querying and data integrity."""
        if self._db is None:
            return

        try:
            # Inspections Collection
            inspections = self._db["inspections"]
            inspections.create_index([("inspection_id", ASCENDING)], unique=True)
            inspections.create_index([("inspection_timestamp", DESCENDING)])
            inspections.create_index([("predicted_category", ASCENDING)])
            inspections.create_index([("inspection_status", ASCENDING)])
            inspections.create_index([("healthy_or_defective", ASCENDING)])
            inspections.create_index([("model_version", ASCENDING)])

            # Models Collection
            models = self._db["models"]
            models.create_index([("model_version", ASCENDING)], unique=True)
            models.create_index([("deployment_status", ASCENDING)])

            # Users Collection
            users = self._db["users"]
            users.create_index([("email", ASCENDING)], unique=True)
            users.create_index([("user_id", ASCENDING)], unique=True)
        except PyMongoError as e:
            print(f"[MongoDB Warning] Index creation notice: {e}")

    # ==========================================
    # INSPECTIONS CRUD
    # ==========================================
    def insert_inspection(self, doc: Dict[str, Any]) -> str:
        db = self.get_db()
        if db is None:
            raise RuntimeError("MongoDB is not connected")

        if "inspection_timestamp" not in doc:
            doc["inspection_timestamp"] = datetime.utcnow()

        result = db["inspections"].insert_one(doc)
        return str(result.inserted_id)

    def get_inspection_by_id(self, inspection_id: str) -> Optional[Dict[str, Any]]:
        db = self.get_db()
        if db is None:
            return None
        doc = db["inspections"].find_one({"inspection_id": inspection_id})
        if doc and "_id" in doc:
            doc["_id"] = str(doc["_id"])
        return doc

    def get_inspections(
        self,
        category: Optional[str] = None,
        status: Optional[str] = None,
        search_query: Optional[str] = None,
        skip: int = 0,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        db = self.get_db()
        if db is None:
            return []

        query = {}
        if category and category != "All":
            query["predicted_category"] = category
        if status and status != "All":
            query["healthy_or_defective"] = status
        if search_query:
            query["$or"] = [
                {"inspection_id": {"$regex": search_query, "$options": "i"}},
                {"image_filename": {"$regex": search_query, "$options": "i"}},
                {"predicted_category": {"$regex": search_query, "$options": "i"}}
            ]

        cursor = db["inspections"].find(query).sort("inspection_timestamp", DESCENDING).skip(skip).limit(limit)
        results = []
        for doc in cursor:
            doc["_id"] = str(doc["_id"])
            results.append(doc)
        return results

    def count_inspections(self, category: Optional[str] = None, status: Optional[str] = None) -> int:
        db = self.get_db()
        if db is None:
            return 0
        query = {}
        if category and category != "All":
            query["predicted_category"] = category
        if status and status != "All":
            query["healthy_or_defective"] = status
        return db["inspections"].count_documents(query)

    def delete_inspection(self, inspection_id: str) -> bool:
        db = self.get_db()
        if db is None:
            return False
        res = db["inspections"].delete_one({"inspection_id": inspection_id})
        return res.deleted_count > 0

    # ==========================================
    # ANALYTICS QUERIES
    # ==========================================
    def get_analytics_summary(self) -> Dict[str, Any]:
        """Aggregate total counts, healthy/defective ratios, fault breakdown, and trends."""
        db = self.get_db()
        default_stats = {
            "total_inspections": 0,
            "healthy_panels": 0,
            "defective_panels": 0,
            "uncertain_panels": 0,
            "fault_detection_rate": 0.0,
            "average_confidence": 0.0,
            "category_distribution": {},
            "daily_trends": []
        }
        if db is None:
            return default_stats

        total = db["inspections"].count_documents({})
        if total == 0:
            return default_stats

        healthy = db["inspections"].count_documents({"healthy_or_defective": "Healthy"})
        defective = db["inspections"].count_documents({"healthy_or_defective": "Defective"})
        uncertain = db["inspections"].count_documents({"healthy_or_defective": "Uncertain"})

        # Confidence average
        avg_conf_agg = list(db["inspections"].aggregate([
            {"$group": {"_id": None, "avg_conf": {"$avg": "$confidence_score"}}}
        ]))
        avg_conf = round(avg_conf_agg[0]["avg_conf"], 2) if avg_conf_agg else 0.0

        # Category distribution
        cat_agg = list(db["inspections"].aggregate([
            {"$group": {"_id": "$predicted_category", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]))
        category_distribution = {item["_id"]: item["count"] for item in cat_agg if item["_id"]}

        # Daily trends (last 30 days)
        trends_agg = list(db["inspections"].aggregate([
            {
                "$group": {
                    "_id": {
                        "$dateToString": {"format": "%Y-%m-%d", "date": "$inspection_timestamp"}
                    },
                    "count": {"$sum": 1},
                    "defective": {
                        "$sum": {"$cond": [{"$eq": ["$healthy_or_defective", "Defective"]}, 1, 0]}
                    },
                    "healthy": {
                        "$sum": {"$cond": [{"$eq": ["$healthy_or_defective", "Healthy"]}, 1, 0]}
                    }
                }
            },
            {"$sort": {"_id": 1}},
            {"$limit": 30}
        ]))

        fault_rate = round((defective / total) * 100, 2) if total > 0 else 0.0

        return {
            "total_inspections": total,
            "healthy_panels": healthy,
            "defective_panels": defective,
            "uncertain_panels": uncertain,
            "fault_detection_rate": fault_rate,
            "average_confidence": avg_conf,
            "category_distribution": category_distribution,
            "daily_trends": trends_agg
        }

    # ==========================================
    # MODEL METRICS & REGISTRY
    # ==========================================
    def save_model_record(self, doc: Dict[str, Any]) -> str:
        db = self.get_db()
        if db is None:
            raise RuntimeError("MongoDB is not connected")

        # Deactivate previous active models if this one is active
        if doc.get("deployment_status") == "Active":
            db["models"].update_many({}, {"$set": {"deployment_status": "Archived"}})

        result = db["models"].update_one(
            {"model_version": doc["model_version"]},
            {"$set": doc},
            upsert=True
        )
        return doc["model_version"]

    def get_active_model(self) -> Optional[Dict[str, Any]]:
        db = self.get_db()
        if db is None:
            return None
        doc = db["models"].find_one({"deployment_status": "Active"})
        if not doc:
            # Fallback to most recent model
            doc = db["models"].find_one(sort=[("training_date", DESCENDING)])
        if doc and "_id" in doc:
            doc["_id"] = str(doc["_id"])
        return doc

# Global singleton accessor
db_manager = MongoDBManager()

