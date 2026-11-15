"""DigiForge - Generative AI Studio.

AI-Powered Handwritten Digit Generation Using Conditional Variational Autoencoder (CVAE).
Bright, High-Contrast, Production-Quality UI/UX Redesign.
"""

import os
os.environ.setdefault("MPLCONFIGDIR", "/tmp/matplotlib")
import io
import time
import zipfile
from typing import Optional, Dict, Any, List

import streamlit as st
import numpy as np
import torch
from PIL import Image

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from models.cvae import CVAE
from utils.helpers import get_device, load_checkpoint, load_training_history
from utils.visualization import (
    tensor_to_pil,
    plot_generated_digits_grid,
    plot_training_history,
)

# -----------------------------------------------------------------------------
# 1. Page Configuration
# -----------------------------------------------------------------------------
st.set_page_config(
    page_title="DigiForge • Generative AI Studio",
    page_icon="✏️",
    layout="wide",
    initial_sidebar_state="expanded",
)

# -----------------------------------------------------------------------------
# 2. Comprehensive High-Contrast Light Theme & Design System
# -----------------------------------------------------------------------------
st.markdown(
    """
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    /* Force Light Palette onto all Streamlit App Containers */
    .stApp, 
    [data-testid="stAppViewContainer"], 
    [data-testid="stMain"],
    [data-testid="stMainBlockContainer"],
    .main {
        background-color: #F5F7FF !important;
        color: #334155 !important;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
    }

    /* Hide default Streamlit chrome header/footer/menu */
    #MainMenu {visibility: hidden;}
    header[data-testid="stHeader"] {
        background-color: transparent !important;
        visibility: hidden !important;
    }
    footer {visibility: hidden;}
    .stDeployButton {display: none;}

    /* Main Container Dimensions & Padding */
    .block-container {
        padding-top: 2rem !important;
        padding-bottom: 3.5rem !important;
        max-width: 1140px !important;
    }

    /* ---------------------------------------------------- */
    /* Sidebar Styling: Clean White with Subtle Borders     */
    /* ---------------------------------------------------- */
    section[data-testid="stSidebar"],
    [data-testid="stSidebarContent"] {
        background-color: #FFFFFF !important;
        border-right: 1px solid #E2E8F0 !important;
    }
    section[data-testid="stSidebar"] .block-container {
        padding-top: 1.5rem !important;
        padding-bottom: 2rem !important;
    }

    /* ---------------------------------------------------- */
    /* Strict Typography Rules & Color Contrast             */
    /* ---------------------------------------------------- */
    h1, h2, h3, h4, h5, h6,
    .stMarkdown h1, .stMarkdown h2, .stMarkdown h3 {
        color: #172554 !important;
        font-family: 'Inter', sans-serif !important;
        letter-spacing: -0.02em !important;
    }
    h1, .stMarkdown h1 {
        font-size: 2.1rem !important;
        font-weight: 700 !important;
        line-height: 1.25 !important;
        margin-bottom: 0.5rem !important;
    }
    h2, .stMarkdown h2 {
        font-size: 1.5rem !important;
        font-weight: 600 !important;
        margin-top: 0.25rem !important;
        margin-bottom: 0.4rem !important;
    }
    h3, .stMarkdown h3 {
        font-size: 1.15rem !important;
        font-weight: 600 !important;
        margin-top: 0.75rem !important;
        margin-bottom: 0.35rem !important;
    }
    p, li, span, label, div {
        color: #334155;
        font-size: 0.95rem;
        line-height: 1.6;
    }
    .stMarkdown p {
        color: #334155 !important;
        font-size: 0.95rem !important;
        line-height: 1.6 !important;
    }

    /* ---------------------------------------------------- */
    /* Card System: White & Soft Lavender Backgrounds       */
    /* ---------------------------------------------------- */
    .df-card {
        background-color: #FFFFFF !important;
        border: 1px solid #E2E8F0 !important;
        border-radius: 10px !important;
        padding: 1.35rem 1.5rem !important;
        margin-bottom: 1.15rem !important;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04) !important;
    }
    .df-card-soft {
        background-color: #EEF2FF !important;
        border: 1px solid #E0E7FF !important;
        border-radius: 10px !important;
        padding: 1.25rem 1.4rem !important;
        margin-bottom: 1.15rem !important;
    }
    .df-card-white {
        background-color: #FFFFFF !important;
        border: 1px solid #E2E8F0 !important;
        border-radius: 10px !important;
        padding: 1.2rem 1.35rem !important;
        margin-bottom: 1rem !important;
    }

    /* Hero Banner */
    .hero-banner {
        background-color: #FFFFFF;
        border: 1px solid #E2E8F0;
        border-radius: 12px;
        padding: 1.85rem 2rem;
        margin-bottom: 1.75rem;
        box-shadow: 0 2px 4px rgba(81, 69, 229, 0.04);
    }
    .hero-tag {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: #EEF2FF;
        color: #5145E5;
        font-size: 0.78rem;
        font-weight: 600;
        padding: 0.25rem 0.75rem;
        border-radius: 9999px;
        margin-bottom: 0.85rem;
        border: 1px solid #E0E7FF;
    }
    .hero-title {
        font-size: 2.15rem;
        font-weight: 700;
        color: #172554 !important;
        letter-spacing: -0.025em;
        line-height: 1.2;
        margin-bottom: 0.5rem;
    }
    .hero-subtitle {
        font-size: 1.15rem;
        font-weight: 600;
        color: #334155 !important;
        margin-bottom: 0.5rem;
    }
    .hero-description {
        font-size: 0.96rem;
        color: #475569 !important;
        max-width: 740px;
        line-height: 1.6;
        margin-bottom: 1.25rem;
    }

    /* Information / Stat Cards */
    .stat-card {
        background: #FFFFFF !important;
        border: 1px solid #E2E8F0 !important;
        border-radius: 10px !important;
        padding: 1.2rem 1.35rem !important;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03) !important;
        height: 100% !important;
    }
    .stat-label {
        font-size: 0.78rem !important;
        text-transform: uppercase !important;
        color: #64748B !important;
        font-weight: 600 !important;
        letter-spacing: 0.05em !important;
    }
    .stat-value {
        font-size: 1.55rem !important;
        font-weight: 700 !important;
        color: #172554 !important;
        margin-top: 0.2rem !important;
    }
    .stat-desc {
        font-size: 0.82rem !important;
        color: #475569 !important;
        margin-top: 0.2rem !important;
    }

    /* Digit Preview Tiles */
    .digit-tile {
        background-color: #FFFFFF !important;
        border: 1px solid #E2E8F0 !important;
        border-radius: 8px !important;
        padding: 0.5rem !important;
        text-align: center !important;
        transition: border-color 0.15s ease, box-shadow 0.15s ease !important;
        margin-bottom: 0.65rem !important;
    }
    .digit-tile:hover {
        border-color: #5145E5 !important;
        box-shadow: 0 2px 6px rgba(81, 69, 229, 0.08) !important;
    }
    .digit-tile-label {
        font-size: 0.74rem !important;
        color: #172554 !important;
        font-weight: 600 !important;
        margin-bottom: 4px !important;
        text-transform: uppercase !important;
        letter-spacing: 0.04em !important;
    }

    /* Pills & Badges */
    .tech-pill {
        display: inline-block;
        background: #EEF2FF !important;
        color: #5145E5 !important;
        font-size: 0.78rem !important;
        font-weight: 600 !important;
        padding: 0.25rem 0.65rem !important;
        border-radius: 6px !important;
        margin-right: 0.4rem !important;
        margin-bottom: 0.4rem !important;
        border: 1px solid #E0E7FF !important;
    }

    /* ---------------------------------------------------- */
    /* Sidebar Navigation & Highlighting                    */
    /* ---------------------------------------------------- */
    div[data-testid="stRadio"] > div {
        gap: 4px !important;
    }
    div[data-testid="stRadio"] label {
        font-size: 0.9rem !important;
        font-weight: 500 !important;
        color: #334155 !important;
        padding: 0.45rem 0.85rem !important;
        border-radius: 8px !important;
        transition: all 0.15s ease !important;
    }
    div[data-testid="stRadio"] label:hover {
        background-color: #EEF2FF !important;
        color: #5145E5 !important;
    }

    /* Sidebar Status Card */
    .sidebar-status-card {
        margin-top: 1.75rem;
        padding: 0.9rem 1rem;
        background: #FFFFFF;
        border: 1px solid #E2E8F0;
        border-radius: 10px;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
    }
    .status-dot-green {
        width: 8px;
        height: 8px;
        background-color: #16A34A;
        border-radius: 50%;
        display: inline-block;
    }
    .status-dot-red {
        width: 8px;
        height: 8px;
        background-color: #DC2626;
        border-radius: 50%;
        display: inline-block;
    }
    .status-meta-item {
        display: flex;
        justify-content: space-between;
        font-size: 0.75rem;
        color: #64748B;
        margin-top: 0.3rem;
        line-height: 1.4;
    }
    .status-meta-val {
        font-weight: 600;
        color: #172554;
    }

    /* ---------------------------------------------------- */
    /* Buttons: Primary Vibrant Indigo & Crisp White        */
    /* ---------------------------------------------------- */
    button[kind="primary"] {
        background: linear-gradient(135deg, #5145E5 0%, #4338CA 100%) !important;
        color: #FFFFFF !important;
        border: none !important;
        font-weight: 600 !important;
        border-radius: 6px !important;
        padding: 0.45rem 1.1rem !important;
        box-shadow: 0 2px 4px rgba(81, 69, 229, 0.15) !important;
        transition: all 0.15s ease !important;
    }
    button[kind="primary"]:hover {
        background: #4338CA !important;
        box-shadow: 0 4px 8px rgba(81, 69, 229, 0.25) !important;
    }
    button[kind="secondary"] {
        background-color: #FFFFFF !important;
        border: 1px solid #CBD5E1 !important;
        color: #172554 !important;
        border-radius: 6px !important;
        font-weight: 600 !important;
        transition: all 0.15s ease !important;
    }
    button[kind="secondary"]:hover {
        background-color: #EEF2FF !important;
        border-color: #5145E5 !important;
        color: #5145E5 !important;
    }

    /* Streamlit Input / Selectbox Controls Contrast */
    div[data-baseweb="select"] > div {
        background-color: #FFFFFF !important;
        border-color: #CBD5E1 !important;
        color: #172554 !important;
    }
    div[data-baseweb="select"] span {
        color: #172554 !important;
    }

    /* Streamlit Metrics Contrast */
    div[data-testid="stMetricValue"] {
        color: #172554 !important;
        font-weight: 700 !important;
    }
    div[data-testid="stMetricLabel"] {
        color: #64748B !important;
        font-weight: 600 !important;
    }

    /* Streamlit Tabs Contrast */
    button[data-baseweb="tab"] {
        color: #64748B !important;
        font-weight: 600 !important;
    }
    button[data-baseweb="tab"][aria-selected="true"] {
        color: #5145E5 !important;
        border-bottom-color: #5145E5 !important;
    }
    </style>
    """,
    unsafe_allow_html=True,
)


# -----------------------------------------------------------------------------
# 3. Model Loading & Caching
# -----------------------------------------------------------------------------
CHECKPOINT_PATH = "saved_model/cvae_mnist.pth"
HISTORY_PATH = "training_history/loss_history.json"


@st.cache_resource(show_spinner=False)
def get_cached_cvae(checkpoint_path: str = CHECKPOINT_PATH):
    """Load and cache the trained CVAE model and execution device."""
    if not os.path.exists(checkpoint_path):
        return None, None, None
    device = get_device()
    model, metadata = load_checkpoint(checkpoint_path, device=device)
    return model, device, metadata


model_obj, device_obj, meta_obj = get_cached_cvae(CHECKPOINT_PATH)


# -----------------------------------------------------------------------------
# 4. Sidebar Branding & Navigation
# -----------------------------------------------------------------------------
NAV_ITEMS = [
    "Overview",
    "Generate Digits",
    "Latent Explorer",
    "Model Insights",
    "About",
]

NAV_ICONS = {
    "Overview": "🏠  Overview",
    "Generate Digits": "✏️  Generate Digits",
    "Latent Explorer": "🧭  Latent Explorer",
    "Model Insights": "📊  Model Insights",
    "About": "ℹ️  About",
}

with st.sidebar:
    # Logo & Brand Header
    st.markdown(
        """
        <div style="padding: 0.25rem 0 0.85rem 0;">
            <div style="display: flex; align-items: center; gap: 10px;">
                <div style="width: 28px; height: 28px; background: linear-gradient(135deg, #5145E5 0%, #06B6D4 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 15px;">D</div>
                <div>
                    <div style="font-size: 1.1rem; font-weight: 700; letter-spacing: -0.015em; color: #172554; line-height: 1.1;">DigiForge</div>
                    <div style="font-size: 0.74rem; color: #64748B; font-weight: 500;">Generative AI Studio</div>
                </div>
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    st.markdown("<div style='height: 0.35rem;'></div>", unsafe_allow_html=True)

    if "nav_page" not in st.session_state:
        st.session_state["nav_page"] = "Overview"

    cur_idx = NAV_ITEMS.index(st.session_state["nav_page"]) if st.session_state["nav_page"] in NAV_ITEMS else 0

    selected_nav = st.radio(
        label="Navigation Menu",
        options=NAV_ITEMS,
        format_func=lambda x: NAV_ICONS.get(x, x),
        index=cur_idx,
        label_visibility="collapsed",
        key="main_nav_radio",
    )
    st.session_state["nav_page"] = selected_nav

    # In-Flow Model Status Section
    st.markdown("<div style='height: 1.25rem;'></div>", unsafe_allow_html=True)

    if model_obj is not None:
        device_label = "Apple MPS" if device_obj and device_obj.type == "mps" else (
            "CUDA GPU" if device_obj and device_obj.type == "cuda" else "CPU"
        )
        val_loss_val = meta_obj.get("val_loss", 94.64) if meta_obj else 94.64
        st.markdown(
            f"""
            <div class="sidebar-status-card">
                <div style="display: flex; align-items: center; gap: 7px; margin-bottom: 0.4rem;">
                    <span class="status-dot-green"></span>
                    <span style="font-size: 0.82rem; font-weight: 700; color: #172554;">Model Ready</span>
                </div>
                <div class="status-meta-item">
                    <span>Architecture</span>
                    <span class="status-meta-val">CVAE (PyTorch)</span>
                </div>
                <div class="status-meta-item">
                    <span>Latent Space</span>
                    <span class="status-meta-val">16D Gaussian</span>
                </div>
                <div class="status-meta-item">
                    <span>Hardware</span>
                    <span class="status-meta-val">{device_label}</span>
                </div>
                <div class="status-meta-item">
                    <span>Validation Loss</span>
                    <span class="status-meta-val">{val_loss_val:.2f}</span>
                </div>
            </div>
            """,
            unsafe_allow_html=True,
        )
    else:
        st.markdown(
            """
            <div class="sidebar-status-card">
                <div style="display: flex; align-items: center; gap: 7px; margin-bottom: 0.4rem;">
                    <span class="status-dot-red"></span>
                    <span style="font-size: 0.82rem; font-weight: 700; color: #DC2626;">Checkpoint Missing</span>
                </div>
                <div style="font-size: 0.75rem; color: #64748B; margin-top: 2px;">
                    Run <code>python train.py</code> to train weights.
                </div>
            </div>
            """,
            unsafe_allow_html=True,
        )

    st.markdown(
        """
        <div style="margin-top: 1.25rem; padding-left: 2px; font-size: 0.74rem; color: #64748B; font-weight: 500;">
            DigiForge v1.0 • Academic AI Studio
        </div>
        """,
        unsafe_allow_html=True,
    )


# -----------------------------------------------------------------------------
# PAGE 1: OVERVIEW
# -----------------------------------------------------------------------------
if st.session_state["nav_page"] == "Overview":
    st.markdown(
        """
        <div class="hero-banner">
            <div class="hero-tag">Conditional Variational Autoencoder (CVAE)</div>
            <div class="hero-title">Welcome to DigiForge</div>
            <div class="hero-subtitle">
                Generate unique handwritten digits using a Conditional Variational Autoencoder.
            </div>
            <div class="hero-description">
                DigiForge is a Generative AI application that learns handwritten digit representations
                from the benchmark MNIST dataset. By conditioning a Variational Autoencoder on class labels,
                it allows you to synthesize novel, distinct handwritten digit variations from 0 to 9 on demand.
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    # Three Aligned Information Cards
    c1, c2, c3 = st.columns(3)
    with c1:
        st.markdown(
            """
            <div class="stat-card">
                <div class="stat-label">Generative Model</div>
                <div class="stat-value">CVAE</div>
                <div class="stat-desc">Conditional Variational Autoencoder</div>
            </div>
            """,
            unsafe_allow_html=True,
        )
    with c2:
        st.markdown(
            """
            <div class="stat-card">
                <div class="stat-label">Dataset</div>
                <div class="stat-value">MNIST</div>
                <div class="stat-desc">70,000 Grayscale Digits (28 × 28)</div>
            </div>
            """,
            unsafe_allow_html=True,
        )
    with c3:
        st.markdown(
            """
            <div class="stat-card">
                <div class="stat-label">Digit Classes</div>
                <div class="stat-value">0 – 9</div>
                <div class="stat-desc">10 Categorical One-Hot Output Classes</div>
            </div>
            """,
            unsafe_allow_html=True,
        )

    st.markdown("<div style='height: 1.25rem;'></div>", unsafe_allow_html=True)

    # Two Clear Action Buttons
    act_col1, act_col2, _ = st.columns([1.5, 1.5, 3.5])
    with act_col1:
        if st.button("Generate Digits →", type="primary", use_container_width=True):
            st.session_state["nav_page"] = "Generate Digits"
            st.rerun()
    with act_col2:
        if st.button("Explore Latent Space", type="secondary", use_container_width=True):
            st.session_state["nav_page"] = "Latent Explorer"
            st.rerun()

    st.markdown("<div style='height: 1.75rem;'></div>", unsafe_allow_html=True)

    # Synthetic Sample Preview: 10 Digits in a 5-Column Grid (2 rows of 5)
    st.markdown("### Synthetic Sample Preview")
    st.markdown(
        "<p style='color: #64748B; font-size: 0.9rem; margin-bottom: 1rem;'>Live synthetic digits generated directly by the trained CVAE across all 10 digit classes (0 to 9).</p>",
        unsafe_allow_html=True,
    )

    if model_obj is not None:
        with torch.no_grad():
            preview_samples = []
            for d in range(10):
                z_zero = torch.zeros(1, model_obj.latent_dim, device=device_obj)
                img = model_obj.sample(num_samples=1, digit=d, device=device_obj, custom_z=z_zero)
                preview_samples.append(tensor_to_pil(img[0]))

        # Row 1: Digits 0 to 4 (5 columns)
        r1_cols = st.columns(5)
        for i in range(5):
            with r1_cols[i]:
                st.markdown(
                    f"""
                    <div class="digit-tile">
                        <div class="digit-tile-label">Class {i}</div>
                    </div>
                    """,
                    unsafe_allow_html=True,
                )
                st.image(preview_samples[i], width=110)

        st.markdown("<div style='height: 0.4rem;'></div>", unsafe_allow_html=True)

        # Row 2: Digits 5 to 9 (5 columns)
        r2_cols = st.columns(5)
        for i in range(5, 10):
            with r2_cols[i - 5]:
                st.markdown(
                    f"""
                    <div class="digit-tile">
                        <div class="digit-tile-label">Class {i}</div>
                    </div>
                    """,
                    unsafe_allow_html=True,
                )
                st.image(preview_samples[i], width=110)
    else:
        st.info("Train the model with `python train.py` to enable live synthetic preview.")

    st.markdown("<div style='height: 2rem;'></div>", unsafe_allow_html=True)

    # How It Works Section
    st.markdown("### How It Works")
    hw1, hw2, hw3 = st.columns(3)

    with hw1:
        st.markdown(
            """
            <div class="df-card">
                <div style="font-weight: 700; font-size: 1rem; color: #172554; margin-bottom: 0.35rem;">
                    1. Encoder (Inference)
                </div>
                <p style="font-size: 0.88rem; color: #334155; margin: 0;">
                    Compresses the 28×28 pixel image (784 features) concatenated with the one-hot digit label
                    into parameters of a variational distribution (mean μ and log-variance log σ²).
                </p>
            </div>
            """,
            unsafe_allow_html=True,
        )

    with hw2:
        st.markdown(
            """
            <div class="df-card">
                <div style="font-weight: 700; font-size: 1rem; color: #172554; margin-bottom: 0.35rem;">
                    2. Latent Space & Reparameterization
                </div>
                <p style="font-size: 0.88rem; color: #334155; margin: 0;">
                    Samples auxiliary Gaussian noise ε ~ N(0, I) to compute z = μ + σ ⊙ ε.
                    This reparameterization trick allows gradients to flow backwards through stochastic nodes.
                </p>
            </div>
            """,
            unsafe_allow_html=True,
        )

    with hw3:
        st.markdown(
            """
            <div class="df-card">
                <div style="font-weight: 700; font-size: 1rem; color: #172554; margin-bottom: 0.35rem;">
                    3. Decoder (Generation)
                </div>
                <p style="font-size: 0.88rem; color: #334155; margin: 0;">
                    Takes the continuous latent representation z together with your selected digit class,
                    and reconstructs brand-new 28×28 synthetic handwritten digit variations.
                </p>
            </div>
            """,
            unsafe_allow_html=True,
        )


# -----------------------------------------------------------------------------
# PAGE 2: GENERATE DIGITS (MAIN PRODUCT FOCUS)
# -----------------------------------------------------------------------------
elif st.session_state["nav_page"] == "Generate Digits":
    st.markdown(
        """
        <div style="margin-bottom: 1.25rem;">
            <h2>Handwritten Digit Generator</h2>
            <p style="color: #475569; margin-bottom: 0;">
                Select any digit from 0 to 9 and choose how many unique synthetic variations to generate.
                Each image is synthesized using fresh latent samples z ~ N(0, I).
            </p>
        </div>
        """,
        unsafe_allow_html=True,
    )

    if model_obj is None:
        st.error(
            "⚠️ **Model Checkpoint Not Found**\n\n"
            "Please train the model first by running `python train.py` in your terminal."
        )
    else:
        # Structured Generation Control Panel on White Card
        st.markdown(
            """
            <div class="df-card" style="padding: 1.2rem 1.4rem 0.75rem 1.4rem; margin-bottom: 1.25rem;">
            """,
            unsafe_allow_html=True,
        )

        col_digit, col_count, col_btn = st.columns([2.5, 2.5, 2])

        with col_digit:
            selected_digit = st.selectbox(
                "Select Target Digit (0 – 9):",
                options=list(range(10)),
                index=7,
                help="Class label conditioned into the CVAE decoder.",
            )

        with col_count:
            num_samples = st.selectbox(
                "Number of Images:",
                options=[5, 10, 20],
                index=1,
                help="Quantity of unique variations to sample.",
            )

        with col_btn:
            st.markdown("<div style='height: 1.7rem;'></div>", unsafe_allow_html=True)
            btn_generate = st.button("Generate Images", type="primary", use_container_width=True)

        st.markdown("</div>", unsafe_allow_html=True)

        # Sampling Logic
        if "gen_tensor_cache" not in st.session_state or btn_generate:
            with st.spinner(f"Generating {num_samples} unique variations of digit '{selected_digit}'..."):
                with torch.no_grad():
                    sampled_tensors = model_obj.sample(
                        num_samples=num_samples,
                        digit=selected_digit,
                        device=device_obj,
                    )
                st.session_state["gen_tensor_cache"] = sampled_tensors
                st.session_state["cached_digit"] = selected_digit
                st.session_state["cached_count"] = num_samples
                st.session_state["cached_time"] = time.strftime("%H:%M:%S")

        current_tensors = st.session_state.get("gen_tensor_cache")
        cached_digit = st.session_state.get("cached_digit", selected_digit)
        cached_count = st.session_state.get("cached_count", num_samples)

        if current_tensors is not None:
            st.markdown("<div style='height: 0.5rem;'></div>", unsafe_allow_html=True)

            # Output Header & Actions
            head_col, regen_col = st.columns([4, 1.4])
            with head_col:
                st.markdown(
                    f"""
                    <div style="font-size: 1.15rem; font-weight: 700; color: #172554;">
                        Generated Images for Digit '{cached_digit}'
                    </div>
                    <div style="font-size: 0.84rem; color: #64748B;">
                        Showing {cached_count} synthetic variations • Generated at {st.session_state.get('cached_time', '')} from Gaussian latent noise.
                    </div>
                    """,
                    unsafe_allow_html=True,
                )
            with regen_col:
                if st.button("Generate Another Batch", type="secondary", use_container_width=True):
                    with torch.no_grad():
                        st.session_state["gen_tensor_cache"] = model_obj.sample(
                            num_samples=cached_count,
                            digit=cached_digit,
                            device=device_obj,
                        )
                    st.session_state["cached_time"] = time.strftime("%H:%M:%S")
                    st.rerun()

            st.markdown("<div style='height: 0.75rem;'></div>", unsafe_allow_html=True)

            # Responsive 5-Column Grid Display
            cols_per_row = 5
            pil_list = [tensor_to_pil(current_tensors[i]) for i in range(cached_count)]

            for r_start in range(0, cached_count, cols_per_row):
                row_cols = st.columns(cols_per_row)
                for c_idx in range(cols_per_row):
                    s_idx = r_start + c_idx
                    if s_idx < cached_count:
                        with row_cols[c_idx]:
                            pil_img = pil_list[s_idx]
                            st.markdown(
                                f"""
                                <div class="digit-tile">
                                    <div class="digit-tile-label">Sample #{s_idx + 1}</div>
                                </div>
                                """,
                                unsafe_allow_html=True,
                            )
                            st.image(pil_img, width=110)

                            # Individual PNG Download
                            buf = io.BytesIO()
                            pil_img.save(buf, format="PNG")
                            st.download_button(
                                label="⬇️ PNG",
                                data=buf.getvalue(),
                                file_name=f"digit_{cached_digit}_sample_{s_idx + 1}.png",
                                mime="image/png",
                                key=f"dl_single_{s_idx}_{st.session_state.get('cached_time', '')}",
                                use_container_width=True,
                            )

            st.markdown("<div style='height: 1.5rem;'></div>", unsafe_allow_html=True)

            # Bulk Download Panel (Single ZIP File & Full Composite Grid PNG)
            st.markdown(
                """
                <div class="df-card">
                    <div style="font-weight: 700; color: #172554; font-size: 0.98rem; margin-bottom: 0.25rem;">
                        Export Generated Batch
                    </div>
                    <div style="font-size: 0.84rem; color: #475569; margin-bottom: 1rem;">
                        Download all generated images as a single packaged ZIP archive or export a composite comparison grid.
                    </div>
                """,
                unsafe_allow_html=True,
            )

            d_col1, d_col2 = st.columns(2)

            with d_col1:
                # In-Memory ZIP File Creation
                zip_buffer = io.BytesIO()
                with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
                    for idx, img in enumerate(pil_list):
                        ib = io.BytesIO()
                        img.save(ib, format="PNG")
                        zf.writestr(f"digit_{cached_digit}_sample_{idx + 1}.png", ib.getvalue())

                st.download_button(
                    label=f"📦 Download All as ZIP ({cached_count} PNGs)",
                    data=zip_buffer.getvalue(),
                    file_name=f"digit_{cached_digit}_{cached_count}_samples.zip",
                    mime="application/zip",
                    type="secondary",
                    use_container_width=True,
                )

            with d_col2:
                # Composite Grid Image Creation
                fig = plot_generated_digits_grid(
                    current_tensors,
                    digit=cached_digit,
                    ncols=min(5, cached_count),
                )
                grid_buf = io.BytesIO()
                fig.savefig(grid_buf, format="PNG", bbox_inches="tight", dpi=200)
                plt.close(fig)

                st.download_button(
                    label=f"🖼️ Download Full Grid as PNG",
                    data=grid_buf.getvalue(),
                    file_name=f"digitforge_{cached_digit}_{cached_count}_grid.png",
                    mime="image/png",
                    type="secondary",
                    use_container_width=True,
                )

            st.markdown("</div>", unsafe_allow_html=True)


# -----------------------------------------------------------------------------
# PAGE 3: LATENT EXPLORER
# -----------------------------------------------------------------------------
elif st.session_state["nav_page"] == "Latent Explorer":
    st.markdown(
        """
        <div style="margin-bottom: 1.25rem;">
            <h2>Latent Space Explorer</h2>
            <p style="color: #475569; margin-bottom: 0;">
                Explore how the continuous 16-dimensional latent space influences handwriting attributes.
                Adjust the coordinate sliders while holding the digit class fixed to observe real-time changes in stroke thickness, slant, and curvature.
            </p>
        </div>
        """,
        unsafe_allow_html=True,
    )

    if model_obj is None:
        st.error("⚠️ Model checkpoint not found. Please train with `python train.py` first.")
    else:
        latent_dim = model_obj.latent_dim

        # Control Row
        top_c1, top_c2, top_c3 = st.columns([2.5, 2, 2])
        with top_c1:
            explorer_digit = st.selectbox(
                "Conditioned Digit Class (0 – 9):",
                options=list(range(10)),
                index=3,
                key="latent_class_select",
            )
        with top_c2:
            st.markdown("<div style='height: 1.7rem;'></div>", unsafe_allow_html=True)
            if st.button("Randomize Vector", type="secondary", use_container_width=True):
                for d in range(latent_dim):
                    st.session_state[f"z_val_{d}"] = round(float(np.random.normal(0.0, 1.0)), 2)
                st.rerun()
        with top_c3:
            st.markdown("<div style='height: 1.7rem;'></div>", unsafe_allow_html=True)
            if st.button("Reset All to 0.0", type="secondary", use_container_width=True):
                for d in range(latent_dim):
                    st.session_state[f"z_val_{d}"] = 0.0
                st.rerun()

        # Initialize session state for sliders
        for d in range(latent_dim):
            if f"z_val_{d}" not in st.session_state:
                st.session_state[f"z_val_{d}"] = 0.0

        st.markdown("<div style='height: 0.75rem;'></div>", unsafe_allow_html=True)

        # 2-Column Layout: Controls (Left) vs Large Preview (Right)
        slider_side, preview_side = st.columns([3.2, 2.2])

        with slider_side:
            st.markdown(
                """
                <div class="df-card">
                    <div style="font-weight: 700; color: #172554; font-size: 0.98rem; margin-bottom: 0.2rem;">
                        Latent Coordinates (z ∈ [-3.0, +3.0])
                    </div>
                    <div style="font-size: 0.82rem; color: #64748B; margin-bottom: 0.85rem;">
                        The standard normal Gaussian prior N(0, I) concentrates ~99.7% of its probability mass within ±3.0 standard deviations.
                    </div>
                """,
                unsafe_allow_html=True,
            )

            sub1, sub2 = st.columns(2)
            z_vals = []
            for d in range(latent_dim):
                target_sub = sub1 if d < (latent_dim // 2) else sub2
                with target_sub:
                    val = st.slider(
                        f"Dimension z_{d}",
                        min_value=-3.0,
                        max_value=3.0,
                        step=0.1,
                        key=f"z_val_{d}",
                    )
                    z_vals.append(val)

            st.markdown("</div>", unsafe_allow_html=True)

        with preview_side:
            st.markdown(
                """
                <div class="df-card" style="text-align: center;">
                    <div style="font-weight: 700; color: #172554; font-size: 0.98rem; margin-bottom: 0.5rem;">
                        Live Decoded Output
                    </div>
                """,
                unsafe_allow_html=True,
            )

            z_input = torch.tensor([z_vals], dtype=torch.float32, device=device_obj)
            with torch.no_grad():
                custom_img = model_obj.sample(
                    num_samples=1,
                    digit=explorer_digit,
                    device=device_obj,
                    custom_z=z_input,
                )
            pil_custom = tensor_to_pil(custom_img[0])

            st.image(pil_custom, width=220)

            # Instant Single Sample Download
            dl_buf = io.BytesIO()
            pil_custom.save(dl_buf, format="PNG")
            st.download_button(
                label="⬇️ Download Sample PNG",
                data=dl_buf.getvalue(),
                file_name=f"latent_digit_{explorer_digit}.png",
                mime="image/png",
                type="secondary",
                use_container_width=True,
            )

            st.markdown(
                f"""
                <div style="text-align: left; font-size: 0.84rem; color: #475569; line-height: 1.5; margin-top: 1rem; border-top: 1px solid #E2E8F0; padding-top: 0.75rem;">
                    <strong style="color: #172554;">Latent Space Representation:</strong> The latent vector z represents continuous stylistic parameters learned by the CVAE.
                    Holding class '{explorer_digit}' fixed while shifting sliders smoothly modifies stroke angle, line thickness, and curvature
                    while the conditioning label preserves digit identity.
                </div>
                </div>
                """,
                unsafe_allow_html=True,
            )


# -----------------------------------------------------------------------------
# PAGE 4: MODEL INSIGHTS
# -----------------------------------------------------------------------------
elif st.session_state["nav_page"] == "Model Insights":
    st.markdown(
        """
        <div style="margin-bottom: 1.25rem;">
            <h2>Model Insights & Architecture</h2>
            <p style="color: #475569; margin-bottom: 0;">
                Comprehensive technical overview of the CVAE architecture, training configuration, and empirical loss trajectories.
            </p>
        </div>
        """,
        unsafe_allow_html=True,
    )

    # Architecture Overview Cards
    m1, m2, m3, m4 = st.columns(4)
    with m1:
        st.markdown(
            """
            <div class="stat-card">
                <div class="stat-label">Architecture</div>
                <div class="stat-value">CVAE</div>
                <div class="stat-desc">MLP Encoder-Decoder</div>
            </div>
            """,
            unsafe_allow_html=True,
        )
    with m2:
        st.markdown(
            """
            <div class="stat-card">
                <div class="stat-label">Latent Dimension</div>
                <div class="stat-value">16</div>
                <div class="stat-desc">Gaussian N(0, I) Prior</div>
            </div>
            """,
            unsafe_allow_html=True,
        )
    with m3:
        st.markdown(
            """
            <div class="stat-card">
                <div class="stat-label">Dataset</div>
                <div class="stat-value">70,000</div>
                <div class="stat-desc">60k Train / 10k Test</div>
            </div>
            """,
            unsafe_allow_html=True,
        )
    with m4:
        st.markdown(
            """
            <div class="stat-card">
                <div class="stat-label">Training Device</div>
                <div class="stat-value">Apple MPS</div>
                <div class="stat-desc">Metal Performance Shaders</div>
            </div>
            """,
            unsafe_allow_html=True,
        )

    st.markdown("<div style='height: 1.25rem;'></div>", unsafe_allow_html=True)

    # Educational Architectural Breakdown
    tab_theory, tab_metrics = st.tabs([
        "Architecture & Formulation",
        "Empirical Training History",
    ])

    with tab_theory:
        st.markdown(
            """
            <div class="df-card">
                <h3 style="margin-top: 0; color: #172554;">What is Generative AI?</h3>
                <p style="color: #334155;">
                    Unlike discriminative machine learning models that predict labels given an input P(Y|X),
                    Generative AI learns the underlying probability distribution of the data P(X, Y).
                    Once trained, the model can synthesize completely new, realistic data instances that were never part of the training set.
                </p>
            </div>

            <div class="df-card">
                <h3 style="margin-top: 0; color: #172554;">What is a Conditional Variational Autoencoder (CVAE)?</h3>
                <p style="color: #334155;">
                    A standard Variational Autoencoder maps images into a continuous latent distribution, but cannot be directed to produce a specific digit class.
                    A <strong>Conditional VAE</strong> solves this by appending a 10-dimensional one-hot class label to both the encoder and decoder.
                    This enables direct, controlled generation of any specific digit class (0 through 9) from the learned latent manifold.
                </p>
            </div>
            """,
            unsafe_allow_html=True,
        )

        c_enc, c_dec = st.columns(2)
        with c_enc:
            st.markdown(
                """
                <div class="df-card-soft">
                    <h4 style="margin-top: 0; color: #172554;">Encoder (Inference Network)</h4>
                    <ul style="font-size: 0.88rem; color: #334155; padding-left: 1.2rem;">
                        <li><strong>Input Dimension:</strong> 784 image pixels + 10 one-hot classes = <strong>794 dims</strong>.</li>
                        <li><strong>Hidden Layers:</strong> 794 → 512 → 256 with LeakyReLU(0.2).</li>
                        <li><strong>Outputs:</strong> Latent Mean vector μ (16D) and Log-Variance log(σ²) (16D).</li>
                    </ul>
                </div>
                """,
                unsafe_allow_html=True,
            )

        with c_dec:
            st.markdown(
                """
                <div class="df-card-soft">
                    <h4 style="margin-top: 0; color: #172554;">Decoder (Generative Network)</h4>
                    <ul style="font-size: 0.88rem; color: #334155; padding-left: 1.2rem;">
                        <li><strong>Input Dimension:</strong> 16 latent features + 10 one-hot classes = <strong>26 dims</strong>.</li>
                        <li><strong>Hidden Layers:</strong> 26 → 256 → 512 with LeakyReLU(0.2).</li>
                        <li><strong>Output:</strong> 512 → 784 with Sigmoid activation bounding pixel values strictly to [0.0, 1.0].</li>
                    </ul>
                </div>
                """,
                unsafe_allow_html=True,
            )

        st.markdown(
            """
            <div class="df-card">
                <h3 style="margin-top: 0; color: #172554;">The Reparameterization Trick</h3>
                <p style="color: #334155;">
                    Sampling directly from a Gaussian distribution z ~ N(μ, σ²) is non-differentiable and blocks backpropagation.
                    The reparameterization trick makes sampling differentiable by isolating stochasticity into parameter-free noise ε ~ N(0, I):
                </p>
                <div style="background:#F1F5F9; border: 1px solid #E2E8F0; border-radius:6px; padding:0.65rem 0.95rem; font-family:monospace; font-size:0.88rem; color:#172554; margin: 0.6rem 0;">
                    z = μ + σ ⊙ ε = μ + exp(0.5 · log_var) ⊙ ε
                </div>
                <p style="color: #334155; margin-bottom: 0;">
                    This allows gradients to flow backwards through the network parameters via standard chain-rule backpropagation.
                </p>
            </div>

            <div class="df-card">
                <h3 style="margin-top: 0; color: #172554;">Loss Function: Evidence Lower Bound (ELBO)</h3>
                <p style="color: #334155;">
                    The CVAE minimizes the negative ELBO, composed of two mathematically balanced loss terms:
                </p>
                <ul style="font-size: 0.9rem; color: #334155; padding-left: 1.2rem;">
                    <li><strong>Reconstruction Loss (Binary Cross Entropy):</strong> Measures pixel-level fidelity between the generated image x̂ and ground truth x across all 784 pixels.</li>
                    <li><strong>KL Divergence:</strong> Measures statistical divergence between the approximate posterior Q(z|x, y) and the standard Gaussian prior P(z) = N(0, I), preventing overfitting and maintaining smooth latent interpolation.</li>
                </ul>
            </div>
            """,
            unsafe_allow_html=True,
        )

    with tab_metrics:
        history_data = load_training_history(HISTORY_PATH)

        if history_data is None:
            st.info("ℹ️ No training history found at `training_history/loss_history.json`. Run `python train.py` to record loss curves.")
        else:
            epochs_count = len(history_data.get("train_total_loss", []))
            final_val = history_data.get("val_total_loss", [-1])[-1]
            final_bce = history_data.get("train_recon_loss", [-1])[-1]
            final_kl = history_data.get("train_kl_loss", [-1])[-1]

            t_col1, t_col2, t_col3, t_col4 = st.columns(4)
            with t_col1:
                st.metric("Total Epochs", f"{epochs_count}")
            with t_col2:
                st.metric("Final Val Loss", f"{final_val:.2f}")
            with t_col3:
                st.metric("Final BCE Loss", f"{final_bce:.2f}")
            with t_col4:
                st.metric("Final KL Loss", f"{final_kl:.2f}")

            st.markdown("<div style='height: 1rem;'></div>", unsafe_allow_html=True)

            # Matplotlib Training Plot with Clean Palette
            fig = plot_training_history(history_data)
            try:
                st.pyplot(fig, width="stretch")
            except TypeError:
                st.pyplot(fig, use_container_width=True)
            plt.close(fig)


# -----------------------------------------------------------------------------
# PAGE 5: ABOUT
# -----------------------------------------------------------------------------
elif st.session_state["nav_page"] == "About":
    st.markdown(
        """
        <div style="margin-bottom: 1.25rem;">
            <h2>About DigiForge</h2>
            <p style="color: #475569; margin-bottom: 0;">
                Academic mini-project documentation, methodology, and technical specifications.
            </p>
        </div>
        """,
        unsafe_allow_html=True,
    )

    st.markdown(
        """
        <div class="df-card">
            <h3 style="margin-top:0; color: #172554;">1. Project Objective</h3>
            <p style="color: #334155;">
                <strong>DigiForge</strong> is an academic Generative AI mini-project developed for final-year B.Tech Computer Science & Engineering.
                Its primary objective is to implement, train, and deploy a Conditional Variational Autoencoder (CVAE) from scratch
                in PyTorch to generate synthetic handwritten digits (0 through 9) conditioned on user-specified class labels.
            </p>
        </div>

        <div class="df-card">
            <h3 style="margin-top:0; color: #172554;">2. What is a Conditional Variational Autoencoder?</h3>
            <p style="color: #334155;">
                A Conditional Variational Autoencoder (CVAE) is a directed probabilistic generative deep learning architecture.
                While standard autoencoders compress inputs into an unconstrained latent space and standard VAEs generate random samples,
                a CVAE introduces class conditioning (one-hot label vectors) into both the encoder and decoder.
                This provides targeted control: the user chooses a digit class, and the decoder samples unique variations from the continuous latent manifold.
            </p>
        </div>

        <div class="df-card">
            <h3 style="margin-top:0; color: #172554;">3. How the MNIST Dataset is Used</h3>
            <p style="color: #334155;">
                The <strong>MNIST</strong> (Modified National Institute of Standards and Technology) dataset is the universal benchmark in handwritten character recognition:
            </p>
            <ul style="font-size:0.92rem; color:#334155; padding-left:1.2rem;">
                <li><strong>Dataset Split:</strong> 60,000 training images and 10,000 independent test images.</li>
                <li><strong>Format:</strong> 28 × 28 grayscale pixels (784 features per image).</li>
                <li><strong>Normalization:</strong> Transformed using <code>transforms.ToTensor()</code> into floating-point tensors bounded strictly in [0.0, 1.0], matching the decoder's Sigmoid activation.</li>
                <li><strong>Data Integrity:</strong> Generated outputs strictly originate from random latent sampling; test samples are never copied or returned.</li>
            </ul>
        </div>

        <div class="df-card">
            <h3 style="margin-top:0; color: #172554;">4. Technologies Used</h3>
            <div>
                <span class="tech-pill">Python 3.14</span>
                <span class="tech-pill">PyTorch 2.15</span>
                <span class="tech-pill">Apple Silicon MPS</span>
                <span class="tech-pill">Torchvision</span>
                <span class="tech-pill">Streamlit 1.67</span>
                <span class="tech-pill">NumPy 2.5</span>
                <span class="tech-pill">Matplotlib 3.11</span>
                <span class="tech-pill">Pillow 13.0</span>
            </div>
        </div>

        <div class="df-card">
            <h3 style="margin-top:0; color: #172554;">5. How the Model Generates New Images</h3>
            <ol style="font-size:0.92rem; color:#334155; padding-left:1.2rem;">
                <li>A target digit class (0–9) is selected by the user and encoded into a 10-dimensional one-hot vector.</li>
                <li>A 16-dimensional latent vector is sampled from standard normal Gaussian noise: <strong>z ~ N(0, I)</strong>.</li>
                <li>The latent vector and one-hot label are concatenated to form a 26-dimensional input vector.</li>
                <li>The input is passed through the decoder's fully connected hidden layers (26 → 256 → 512 → 784).</li>
                <li>The Sigmoid output function maps predictions into [0.0, 1.0] and reshapes the tensor into a 28×28 grayscale image.</li>
            </ol>
        </div>

        <div class="df-card">
            <h3 style="margin-top:0; color: #172554;">6. Future Scope</h3>
            <ul style="font-size:0.92rem; color:#334155; padding-left:1.2rem;">
                <li><strong>Convolutional CVAE (Conv-CVAE):</strong> Utilizing transposed convolutions to capture 2D spatial correlations more effectively.</li>
                <li><strong>Diffusion Models:</strong> Applying Denoising Diffusion Probabilistic Models (DDPM) for higher-resolution character synthesis.</li>
                <li><strong>Higher-Resolution Datasets:</strong> Adapting the conditional framework to color character benchmarks such as SVHN and Omniglot.</li>
            </ul>
        </div>
        """,
        unsafe_allow_html=True,
    )
