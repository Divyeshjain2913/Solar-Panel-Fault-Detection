"""
Enterprise AI Solar Panel Fault Detection Platform.
Professional Dark-Themed Industrial Inspection Dashboard.
Powered by PyTorch MobileNetV2 Transfer Learning and MongoDB Persistent Storage.
"""

import os
import io
import json
from datetime import datetime
import streamlit as st
from PIL import Image
import pandas as pd
import numpy as np

# Internal module imports
from src.database.mongodb import db_manager
from src.services.inference_service import inference_service, FAULT_METADATA, CLASS_NAMES

# ============================================================
# PAGE CONFIGURATION
# ============================================================
st.set_page_config(
    page_title="SolarGuard AI | Industrial PV Defect Detection",
    page_icon="⚡",
    layout="wide",
    initial_sidebar_state="expanded"
)

# ============================================================
# INDUSTRIAL DARK THEME STYLING
# ============================================================
st.markdown("""
<style>
/* Base Dark Theme Variables */
:root {
    --bg-primary: #0B0D10;
    --bg-sidebar: #111419;
    --card-surface: #161A20;
    --elevated-surface: #1C222A;
    --border-color: #262C35;
    --text-primary: #F5F7FA;
    --text-secondary: #929BA8;
    --accent-blue: #3B82F6;
    --accent-blue-hover: #2563EB;
    --healthy-green: #22C55E;
    --warning-amber: #F59E0B;
    --defective-red: #EF4444;
}

/* Global App Styling */
.stApp {
    background-color: var(--bg-primary);
    color: var(--text-primary);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

/* Sidebar Styling */
section[data-testid="stSidebar"] {
    background-color: var(--bg-sidebar);
    border-right: 1px solid var(--border-color);
}
section[data-testid="stSidebar"] .stMarkdown h1, 
section[data-testid="stSidebar"] .stMarkdown h2, 
section[data-testid="stSidebar"] .stMarkdown h3 {
    color: var(--text-primary);
}

/* Top App Header Banner */
.app-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 18px 24px;
    background: linear-gradient(135deg, #161A20 0%, #111419 100%);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    margin-bottom: 24px;
}
.app-title {
    font-size: 24px;
    font-weight: 700;
    color: var(--text-primary);
    letter-spacing: -0.5px;
    display: flex;
    align-items: center;
    gap: 10px;
}
.app-subtitle {
    font-size: 13px;
    color: var(--text-secondary);
    margin-top: 4px;
}

/* Metric / KPI Cards */
.kpi-container {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    margin-bottom: 24px;
}
.kpi-card {
    background-color: var(--card-surface);
    border: 1px solid var(--border-color);
    border-radius: 10px;
    padding: 18px;
    transition: transform 0.2s ease, border-color 0.2s ease;
}
.kpi-card:hover {
    border-color: var(--accent-blue);
    transform: translateY(-2px);
}
.kpi-label {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-secondary);
    font-weight: 600;
    margin-bottom: 6px;
}
.kpi-value {
    font-size: 28px;
    font-weight: 700;
    color: var(--text-primary);
}
.kpi-subtext {
    font-size: 12px;
    margin-top: 6px;
    color: var(--text-secondary);
}

/* Custom Surface Card */
.surface-card {
    background-color: var(--card-surface);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 22px;
    margin-bottom: 20px;
}

/* Badges */
.badge {
    display: inline-block;
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}
.badge-healthy {
    background-color: rgba(34, 197, 94, 0.15);
    color: var(--healthy-green);
    border: 1px solid rgba(34, 197, 94, 0.3);
}
.badge-defective {
    background-color: rgba(239, 68, 68, 0.15);
    color: var(--defective-red);
    border: 1px solid rgba(239, 68, 68, 0.3);
}
.badge-uncertain {
    background-color: rgba(245, 158, 11, 0.15);
    color: var(--warning-amber);
    border: 1px solid rgba(245, 158, 11, 0.3);
}

/* Clean Button Styling */
div.stButton > button:first-child {
    background-color: var(--accent-blue);
    color: #ffffff;
    border: none;
    padding: 10px 20px;
    font-size: 14px;
    font-weight: 600;
    border-radius: 8px;
    transition: background-color 0.2s ease;
}
div.stButton > button:first-child:hover {
    background-color: var(--accent-blue-hover);
    color: #ffffff;
}

/* File Uploader Customization */
div[data-testid="stFileUploader"] {
    background-color: var(--elevated-surface);
    border: 1px dashed var(--border-color);
    border-radius: 10px;
    padding: 16px;
}
</style>
""", unsafe_allow_html=True)

# ============================================================
# HELPER: MONGODB & MODEL INITIALIZATION
# ============================================================
@st.cache_resource
def init_system_resources():
    connected = db_manager.connect()
    model_loaded = inference_service.model is not None
    return connected, model_loaded

db_connected, model_ready = init_system_resources()

# ============================================================
# SIDEBAR NAVIGATION
# ============================================================
with st.sidebar:
    st.markdown("""
    <div style="display: flex; align-items: center; gap: 10px; padding: 10px 0 20px 0;">
        <span style="font-size: 28px;">⚡</span>
        <div>
            <div style="font-size: 18px; font-weight: 700; color: #F5F7FA; line-height: 1.2;">SOLARGUARD AI</div>
            <div style="font-size: 11px; color: #929BA8; text-transform: uppercase; letter-spacing: 0.5px;">PV Inspection OS v2.1</div>
        </div>
    </div>
    """, unsafe_allow_html=True)

    nav_choice = st.radio(
        "Navigation",
        [
            "📊 Dashboard",
            "🔍 New Inspection",
            "📜 Inspection History",
            "📈 Analytics",
            "🧠 Model Performance",
            "⚙️ Settings"
        ],
        label_visibility="collapsed"
    )

    st.markdown("---")
    st.markdown("<div style='font-size: 11px; color: #929BA8; font-weight: 600; text-transform: uppercase; margin-bottom: 10px;'>SYSTEM TELEMETRY</div>", unsafe_allow_html=True)

    # Status indicators
    db_status_color = "#22C55E" if db_connected else "#EF4444"
    db_status_text = "Connected (Port 27017)" if db_connected else "Disconnected"
    st.markdown(f"""
    <div style="font-size: 12px; margin-bottom: 6px;">
        <span style="color: {db_status_color}; font-size: 14px;">●</span> 
        <span style="color: #F5F7FA; font-weight: 500;">MongoDB:</span> 
        <span style="color: #929BA8;">{db_status_text}</span>
    </div>
    """, unsafe_allow_html=True)

    model_status_color = "#22C55E" if inference_service.model else "#F59E0B"
    model_status_text = "MobileNetV2 (Active)" if inference_service.model else "Standby"
    st.markdown(f"""
    <div style="font-size: 12px; margin-bottom: 12px;">
        <span style="color: {model_status_color}; font-size: 14px;">●</span> 
        <span style="color: #F5F7FA; font-weight: 500;">Inference Engine:</span> 
        <span style="color: #929BA8;">{model_status_text}</span>
    </div>
    """, unsafe_allow_html=True)

    st.markdown("---")
    st.caption("SolarGuard AI Platform • Enterprise Edition")


# ============================================================
# PAGE 1: MAIN DASHBOARD
# ============================================================
if nav_choice == "📊 Dashboard":
    st.markdown("""
    <div class="app-header">
        <div>
            <div class="app-title"><span>⚡</span> Industrial Solar Inspection Dashboard</div>
            <div class="app-subtitle">Real-time photovoltaic telemetry, AI defect monitoring, and MongoDB operational records.</div>
        </div>
        <div>
            <span class="badge badge-healthy">● System Operational</span>
        </div>
    </div>
    """, unsafe_allow_html=True)

    # Query MongoDB for real stats
    analytics = db_manager.get_analytics_summary()
    total = analytics["total_inspections"]
    healthy = analytics["healthy_panels"]
    defective = analytics["defective_panels"]
    fault_rate = analytics["fault_detection_rate"]
    avg_conf = analytics["average_confidence"]

    # Read model accuracy from active evaluation record
    active_model = db_manager.get_active_model()
    test_accuracy = 0.0
    if active_model and "evaluation_metrics" in active_model:
        test_accuracy = active_model["evaluation_metrics"].get("test_accuracy", 0.0)
    elif os.path.exists("models/evaluation_metrics.json"):
        with open("models/evaluation_metrics.json") as f:
            data = json.load(f)
            test_accuracy = data.get("evaluation_metrics", {}).get("test_accuracy", 0.0)

    # KPI Overview Cards
    kpi_cols = st.columns(5)
    with kpi_cols[0]:
        st.markdown(f"""
        <div class="kpi-card">
            <div class="kpi-label">Total Inspected</div>
            <div class="kpi-value">{total}</div>
            <div class="kpi-subtext">Verified PV Modules</div>
        </div>
        """, unsafe_allow_html=True)
    with kpi_cols[1]:
        st.markdown(f"""
        <div class="kpi-card">
            <div class="kpi-label">Healthy Panels</div>
            <div class="kpi-value" style="color: #22C55E;">{healthy}</div>
            <div class="kpi-subtext">Optimal Generation</div>
        </div>
        """, unsafe_allow_html=True)
    with kpi_cols[2]:
        st.markdown(f"""
        <div class="kpi-card">
            <div class="kpi-label">Defective Panels</div>
            <div class="kpi-value" style="color: #EF4444;">{defective}</div>
            <div class="kpi-subtext">Action Required</div>
        </div>
        """, unsafe_allow_html=True)
    with kpi_cols[3]:
        st.markdown(f"""
        <div class="kpi-card">
            <div class="kpi-label">Fault Detection Rate</div>
            <div class="kpi-value" style="color: #F59E0B;">{fault_rate}%</div>
            <div class="kpi-subtext">Anomaly Incident Rate</div>
        </div>
        """, unsafe_allow_html=True)
    with kpi_cols[4]:
        acc_display = f"{test_accuracy}%" if test_accuracy > 0 else "Pending"
        st.markdown(f"""
        <div class="kpi-card">
            <div class="kpi-label">Model Test Accuracy</div>
            <div class="kpi-value" style="color: #3B82F6;">{acc_display}</div>
            <div class="kpi-subtext">MobileNetV2 Unseen Test</div>
        </div>
        """, unsafe_allow_html=True)

    st.markdown("<div style='height: 16px;'></div>", unsafe_allow_html=True)

    # Charts Section
    col_chart1, col_chart2 = st.columns([1, 1])

    with col_chart1:
        st.markdown("<div class='surface-card'>", unsafe_allow_html=True)
        st.subheader("📊 Fault Category Breakdown")
        cat_dist = analytics["category_distribution"]
        if cat_dist:
            df_cat = pd.DataFrame(list(cat_dist.items()), columns=["Category", "Count"]).set_index("Category")
            st.bar_chart(df_cat, color="#3B82F6")
        else:
            st.info("No inspection records logged in MongoDB yet. Run your first inspection below.")
        st.markdown("</div>", unsafe_allow_html=True)

    with col_chart2:
        st.markdown("<div class='surface-card'>", unsafe_allow_html=True)
        st.subheader("🛡️ Condition Split (Healthy vs Defective)")
        if total > 0:
            df_split = pd.DataFrame({
                "Status": ["Healthy", "Defective", "Uncertain"],
                "Panels": [healthy, defective, analytics.get("uncertain_panels", 0)]
            }).set_index("Status")
            st.bar_chart(df_split, color="#22C55E")
        else:
            st.info("Awaiting telemetry records from new inspections.")
        st.markdown("</div>", unsafe_allow_html=True)

    # Recent Inspections Table
    st.markdown("<div class='surface-card'>", unsafe_allow_html=True)
    st.subheader("📋 Recent Inspection Logs")
    recent = db_manager.get_inspections(limit=8)
    if recent:
        table_rows = []
        for r in recent:
            ts = r.get("inspection_timestamp")
            if isinstance(ts, datetime):
                ts_str = ts.strftime("%Y-%m-%d %H:%M")
            else:
                ts_str = str(ts)[:16]
            table_rows.append({
                "Inspection ID": r.get("inspection_id"),
                "Filename": r.get("image_filename"),
                "Detected Fault": r.get("predicted_category"),
                "Confidence": f"{r.get('confidence_score', 0):.1f}%",
                "Status": r.get("healthy_or_defective"),
                "Timestamp": ts_str
            })
        st.dataframe(pd.DataFrame(table_rows), use_container_width=True)
    else:
        st.caption("No recent inspections recorded. Upload a panel image in 'New Inspection'.")
    st.markdown("</div>", unsafe_allow_html=True)


# ============================================================
# PAGE 2: IMAGE INSPECTION
# ============================================================
elif nav_choice == "🔍 New Inspection":
    st.markdown("""
    <div class="app-header">
        <div>
            <div class="app-title"><span>🔍</span> Automated AI PV Inspection</div>
            <div class="app-subtitle">Upload high-resolution solar panel RGB imagery for real-time anomaly classification and report generation.</div>
        </div>
    </div>
    """, unsafe_allow_html=True)

    col_left, col_right = st.columns([1, 1], gap="large")

    with col_left:
        st.markdown("<div class='surface-card'>", unsafe_allow_html=True)
        st.subheader("📤 Image Upload & Ingestion")

        uploaded_file = st.file_uploader(
            "Upload solar panel image (Supported: JPG, JPEG, PNG, WEBP)",
            type=["jpg", "jpeg", "png", "webp"],
            help="High-angle orthomosaic, drone shot, or handheld PV module inspection photograph."
        )

        notes_input = st.text_input(
            "Inspection Notes / Solar String ID (Optional)",
            placeholder="e.g. Inverter String 4, Module #12B"
        )

        if uploaded_file is not None:
            try:
                preview_image = Image.open(uploaded_file).convert("RGB")
                st.image(preview_image, caption=f"Preview: {uploaded_file.name}", use_container_width=True)
            except Exception as e:
                st.error(f"Cannot render image preview: {e}")

        analyze_clicked = st.button("🚀 Run AI Defect Analysis", use_container_width=True, disabled=(uploaded_file is None))
        st.markdown("</div>", unsafe_allow_html=True)

    with col_right:
        st.markdown("<div class='surface-card'>", unsafe_allow_html=True)
        st.subheader("🔬 AI Diagnostic Analysis")

        if analyze_clicked and uploaded_file is not None:
            with st.spinner("Executing MobileNetV2 neural inference & logging to MongoDB..."):
                try:
                    uploaded_file.seek(0)
                    result = inference_service.predict(
                        image_input=uploaded_file,
                        filename=uploaded_file.name,
                        notes=notes_input
                    )

                    # Result Card
                    status = result["healthy_or_defective"]
                    badge_class = "badge-healthy" if status == "Healthy" else ("badge-defective" if status == "Defective" else "badge-uncertain")

                    st.markdown(f"""
                    <div style="background-color: #1C222A; border: 1px solid #262C35; border-radius: 10px; padding: 20px; margin-bottom: 20px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                            <span class="badge {badge_class}">{status}</span>
                            <span style="font-size: 12px; color: #929BA8;">ID: {result['inspection_id']}</span>
                        </div>
                        <div style="font-size: 26px; font-weight: 700; color: #F5F7FA; margin-bottom: 6px;">
                            {result['predicted_category']}
                        </div>
                        <div style="font-size: 14px; color: #929BA8; margin-bottom: 14px;">
                            Confidence Score: <strong style="color: #3B82F6;">{result['confidence_score']}%</strong>
                        </div>
                        <div style="font-size: 13px; color: #F5F7FA; line-height: 1.5; margin-bottom: 12px;">
                            <strong>Diagnosis:</strong> {FAULT_METADATA.get(result.get('raw_class', ''), {}).get('description', 'Surface anomaly evaluated.')}
                        </div>
                        <div style="background-color: rgba(59, 130, 246, 0.1); border-left: 3px solid #3B82F6; padding: 10px 14px; border-radius: 4px; font-size: 13px; color: #F5F7FA;">
                            <strong>Recommended Action:</strong> {result['recommendation']}
                        </div>
                    </div>
                    """, unsafe_allow_html=True)

                    # Class Probabilities Breakdown
                    st.markdown("#### 📊 Probability Distribution Across Classes")
                    probs = result["class_probabilities"]
                    sorted_probs = sorted(probs.items(), key=lambda x: x[1], reverse=True)
                    for cname, score in sorted_probs:
                        col_lbl, col_bar = st.columns([1, 2])
                        with col_lbl:
                            st.write(f"**{cname}**")
                        with col_bar:
                            st.progress(int(score), text=f"{score}%")

                    # Download Inspection Report
                    st.markdown("---")
                    report_content = f"""====================================================
SOLARGUARD AI — INDUSTRIAL INSPECTION REPORT
====================================================
Inspection ID:         {result['inspection_id']}
Timestamp:             {result['timestamp']}
Source Filename:       {uploaded_file.name}
Model Architecture:    MobileNetV2 Industrial Transfer Learning
Model Version:         {result['model_version']}

DIAGNOSTIC SUMMARY:
----------------------------------------------------
Condition Classification:  {result['predicted_category']}
Inspection Status:         {result['healthy_or_defective']}
Confidence Metric:         {result['confidence_score']}%
Risk Level:                {result['risk_level']}

RECOMMENDED INDUSTRIAL REMEDIATION:
----------------------------------------------------
{result['recommendation']}

CLASS PROBABILITY DISTRIBUTION:
----------------------------------------------------
"""
                    for cname, score in sorted_probs:
                        report_content += f"{cname:<24}: {score}%\n"
                    report_content += "====================================================\nEnd of Report. Persisted in MongoDB Solar Collection.\n"

                    st.download_button(
                        label="📥 Download Certified Inspection Report",
                        data=report_content,
                        file_name=f"Report_{result['inspection_id']}.txt",
                        mime="text/plain",
                        use_container_width=True
                    )

                except Exception as e:
                    st.error(f"Inference pipeline error: {str(e)}")
        else:
            st.info("Awaiting image upload. Select a panel image on the left and click 'Run AI Defect Analysis'.")
        st.markdown("</div>", unsafe_allow_html=True)


# ============================================================
# PAGE 3: INSPECTION HISTORY (MONGODB BACKED)
# ============================================================
elif nav_choice == "📜 Inspection History":
    st.markdown("""
    <div class="app-header">
        <div>
            <div class="app-title"><span>📜</span> Persistent Inspection History</div>
            <div class="app-subtitle">Historical audit trail queried directly from MongoDB solar_inspection database.</div>
        </div>
    </div>
    """, unsafe_allow_html=True)

    st.markdown("<div class='surface-card'>", unsafe_allow_html=True)

    # Filter Controls
    fcol1, fcol2, fcol3 = st.columns([1, 1, 2])
    with fcol1:
        cat_filter = st.selectbox("Filter by Category", ["All"] + CLASS_NAMES)
    with fcol2:
        status_filter = st.selectbox("Filter by Status", ["All", "Healthy", "Defective", "Uncertain"])
    with fcol3:
        search_kw = st.text_input("Search Inspection ID or Filename", placeholder="Search...")

    # Fetch from MongoDB
    records = db_manager.get_inspections(
        category=cat_filter,
        status=status_filter,
        search_query=search_kw,
        limit=100
    )

    if records:
        st.write(f"Showing **{len(records)}** records from MongoDB:")

        for rec in records:
            with st.expander(f"📌 {rec.get('inspection_id')} — {rec.get('predicted_category')} ({rec.get('confidence_score')}%) | {str(rec.get('inspection_timestamp'))[:16]}"):
                c1, c2 = st.columns([1, 2])
                with c1:
                    img_path = rec.get("original_image_path")
                    if img_path and os.path.exists(img_path):
                        st.image(img_path, use_container_width=True)
                    else:
                        st.caption("Image file reference stored.")
                with c2:
                    st.markdown(f"**Inspection Status:** `{rec.get('healthy_or_defective')}`")
                    st.markdown(f"**Confidence:** `{rec.get('confidence_score')}%`")
                    st.markdown(f"**Model Version:** `{rec.get('model_version')}`")
                    st.markdown(f"**Remediation:** {rec.get('recommendation')}")
                    if rec.get("inspection_notes"):
                        st.markdown(f"**Notes:** {rec.get('inspection_notes')}")

                    if st.button("🗑️ Delete Record", key=f"del_{rec.get('inspection_id')}"):
                        db_manager.delete_inspection(rec.get("inspection_id"))
                        st.success("Record deleted. Refreshing...")
                        st.rerun()
    else:
        st.info("No matching inspection records found in MongoDB.")
    st.markdown("</div>", unsafe_allow_html=True)


# ============================================================
# PAGE 4: ANALYTICS
# ============================================================
elif nav_choice == "📈 Analytics":
    st.markdown("""
    <div class="app-header">
        <div>
            <div class="app-title"><span>📈</span> Industrial Analytics & Defect Trends</div>
            <div class="app-subtitle">Aggregated statistical telemetry calculated in real-time from MongoDB records.</div>
        </div>
    </div>
    """, unsafe_allow_html=True)

    analytics = db_manager.get_analytics_summary()

    col1, col2 = st.columns(2)
    with col1:
        st.markdown("<div class='surface-card'>", unsafe_allow_html=True)
        st.subheader("📊 Fault Incidence Breakdown")
        dist = analytics["category_distribution"]
        if dist:
            df = pd.DataFrame(list(dist.items()), columns=["Defect Type", "Count"]).set_index("Defect Type")
            st.bar_chart(df, color="#3B82F6")
        else:
            st.caption("No distribution data available yet.")
        st.markdown("</div>", unsafe_allow_html=True)

    with col2:
        st.markdown("<div class='surface-card'>", unsafe_allow_html=True)
        st.subheader("📅 Time-Series Inspection Volume")
        trends = analytics.get("daily_trends", [])
        if trends:
            df_trends = pd.DataFrame([
                {"Date": t["_id"], "Total": t["count"], "Defective": t["defective"], "Healthy": t["healthy"]}
                for t in trends
            ]).set_index("Date")
            st.line_chart(df_trends)
        else:
            st.caption("Historical trend data will populate as daily inspections are logged.")
        st.markdown("</div>", unsafe_allow_html=True)


# ============================================================
# PAGE 5: MODEL PERFORMANCE
# ============================================================
elif nav_choice == "🧠 Model Performance":
    st.markdown("""
    <div class="app-header">
        <div>
            <div class="app-title"><span>🧠</span> AI Model Telemetry & Evaluation</div>
            <div class="app-subtitle">Rigorous verification metrics evaluated against held-out, unseen test datasets.</div>
        </div>
    </div>
    """, unsafe_allow_html=True)

    metrics_file = "models/evaluation_metrics.json"
    metrics_data = None
    if os.path.exists(metrics_file):
        with open(metrics_file, "r") as f:
            metrics_data = json.load(f)

    if metrics_data:
        m_eval = metrics_data.get("evaluation_metrics", {})

        # Top Model KPI Cards
        m_cols = st.columns(4)
        with m_cols[0]:
            st.markdown(f"""
            <div class="kpi-card">
                <div class="kpi-label">Test Accuracy</div>
                <div class="kpi-value" style="color: #22C55E;">{m_eval.get('test_accuracy', 0)}%</div>
                <div class="kpi-subtext">Unseen Held-Out Test Set</div>
            </div>
            """, unsafe_allow_html=True)
        with m_cols[1]:
            st.markdown(f"""
            <div class="kpi-card">
                <div class="kpi-label">Macro Precision</div>
                <div class="kpi-value" style="color: #3B82F6;">{m_eval.get('macro_precision', 0)}%</div>
                <div class="kpi-subtext">False Positive Minimization</div>
            </div>
            """, unsafe_allow_html=True)
        with m_cols[2]:
            st.markdown(f"""
            <div class="kpi-card">
                <div class="kpi-label">Macro Recall</div>
                <div class="kpi-value" style="color: #F59E0B;">{m_eval.get('macro_recall', 0)}%</div>
                <div class="kpi-subtext">Defect Capture Rate</div>
            </div>
            """, unsafe_allow_html=True)
        with m_cols[3]:
            st.markdown(f"""
            <div class="kpi-card">
                <div class="kpi-label">Macro F1-Score</div>
                <div class="kpi-value" style="color: #A855F7;">{m_eval.get('macro_f1', 0)}%</div>
                <div class="kpi-subtext">Harmonic Mean Metric</div>
            </div>
            """, unsafe_allow_html=True)

        st.markdown("<div style='height: 16px;'></div>", unsafe_allow_html=True)

        # Visualizations (Confusion Matrix & Training Curves)
        c_left, c_right = st.columns(2)
        with c_left:
            st.markdown("<div class='surface-card'>", unsafe_allow_html=True)
            st.subheader("🎯 Test Confusion Matrix")
            if os.path.exists("models/confusion_matrix.png"):
                st.image("models/confusion_matrix.png", use_container_width=True)
            else:
                st.caption("Confusion matrix visualization will generate upon test evaluation.")
            st.markdown("</div>", unsafe_allow_html=True)

        with c_right:
            st.markdown("<div class='surface-card'>", unsafe_allow_html=True)
            st.subheader("📉 Training & Validation Curves")
            if os.path.exists("models/training_curves.png"):
                st.image("models/training_curves.png", use_container_width=True)
            else:
                st.caption("Training curves will render upon completion of training epochs.")
            st.markdown("</div>", unsafe_allow_html=True)

        # Classification Report Table
        st.markdown("<div class='surface-card'>", unsafe_allow_html=True)
        st.subheader("📑 Detailed Per-Class Classification Report")
        clf_dict = m_eval.get("classification_report", {})
        if clf_dict:
            rows = []
            for cname in CLASS_NAMES:
                if cname in clf_dict:
                    item = clf_dict[cname]
                    rows.append({
                        "Class": cname,
                        "Precision": f"{item['precision'] * 100:.1f}%",
                        "Recall": f"{item['recall'] * 100:.1f}%",
                        "F1-Score": f"{item['f1-score'] * 100:.1f}%",
                        "Support (Samples)": item['support']
                    })
            st.dataframe(pd.DataFrame(rows), use_container_width=True)
        st.markdown("</div>", unsafe_allow_html=True)

    else:
        st.info("Evaluation metrics not available yet. Model evaluation pipeline is actively compiling.")


# ============================================================
# PAGE 6: SETTINGS & SYSTEM CONFIGURATION
# ============================================================
elif nav_choice == "⚙️ Settings":
    st.markdown("""
    <div class="app-header">
        <div>
            <div class="app-title"><span>⚙️</span> Platform Configuration & Diagnostics</div>
            <div class="app-subtitle">Configure database connections, inference thresholds, and inspect runtime health.</div>
        </div>
    </div>
    """, unsafe_allow_html=True)

    st.markdown("<div class='surface-card'>", unsafe_allow_html=True)
    st.subheader("🗄️ MongoDB Connection Settings")
    st.text_input("MongoDB Connection URI", value=os.getenv("MONGODB_URI", "mongodb://127.0.0.1:27017"), disabled=True)
    st.text_input("Database Name", value=os.getenv("MONGODB_DATABASE", "solar_inspection"), disabled=True)

    if st.button("🔄 Test MongoDB Ping"):
        ok = db_manager.connect()
        if ok:
            st.success("✅ MongoDB connection verified successfully!")
        else:
            st.error("❌ MongoDB connection failed. Please ensure mongod service is running.")

    st.markdown("---")
    st.subheader("🎯 Inference Confidence Threshold")
    threshold = st.slider(
        "Uncertainty Threshold (Below this value, manual inspection is triggered)",
        min_value=0.40,
        max_value=0.85,
        value=0.55,
        step=0.05
    )
    st.caption(f"Current threshold: {int(threshold * 100)}%. Predictions below this confidence flag 'Uncertain - Manual Inspection Required'.")
    st.markdown("</div>", unsafe_allow_html=True)
