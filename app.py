"""DigitForge - Generative AI Studio.

AI-Powered Handwritten Digit Generation Using Conditional Variational Autoencoder (CVAE).
Professional Academic UI/UX Redesign.
"""

import os
os.environ.setdefault("MPLCONFIGDIR", "/tmp/matplotlib")
import io
import time
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
    page_title="DigitForge • Generative AI Studio",
    page_icon="✏️",
    layout="wide",
    initial_sidebar_state="expanded",
)

# -----------------------------------------------------------------------------
# 2. Minimal, Modern Design System & CSS
# -----------------------------------------------------------------------------
st.markdown(
    """
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

    /* Global Typography & Palette */
    html, body, [class*="css"] {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        color: #172033;
        background-color: #FFFFFF;
    }

    /* Hide default Streamlit clutter */
    #MainMenu {visibility: hidden;}
    header {visibility: hidden;}
    footer {visibility: hidden;}
    .stDeployButton {display: none;}

    /* Main Container Padding */
    .block-container {
        padding-top: 2rem;
        padding-bottom: 3.5rem;
        max-width: 1160px;
    }

    /* Sidebar Refinement */
    section[data-testid="stSidebar"] {
        background-color: #F8FAFC;
        border-right: 1px solid #E2E8F0;
    }
    section[data-testid="stSidebar"] .block-container {
        padding-top: 1.5rem;
        padding-bottom: 2rem;
    }

    /* Headings */
    h1, h2, h3, h4 {
        color: #172033;
        font-weight: 600;
        letter-spacing: -0.02em;
    }
    h1 {
        font-size: 2.1rem;
        line-height: 1.25;
        margin-bottom: 0.5rem;
    }
    h2 {
        font-size: 1.5rem;
        margin-top: 0.25rem;
        margin-bottom: 0.5rem;
    }
    h3 {
        font-size: 1.15rem;
        margin-top: 1rem;
        margin-bottom: 0.5rem;
    }
    p, li {
        color: #475569;
        font-size: 0.95rem;
        line-height: 1.6;
    }

    /* Hero Section */
    .hero-container {
        padding: 1.5rem 0 2rem 0;
        border-bottom: 1px solid #E2E8F0;
        margin-bottom: 2rem;
    }
    .hero-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: #EEF2FF;
        color: #4F46E5;
        font-size: 0.78rem;
        font-weight: 600;
        padding: 0.25rem 0.75rem;
        border-radius: 9999px;
        margin-bottom: 1rem;
        letter-spacing: 0.02em;
    }
    .hero-title {
        font-size: 2.25rem;
        font-weight: 700;
        color: #172033;
        letter-spacing: -0.025em;
        line-height: 1.2;
        margin-bottom: 0.75rem;
    }
    .hero-desc {
        font-size: 1.05rem;
        color: #64748B;
        max-width: 680px;
        line-height: 1.6;
        margin-bottom: 1.5rem;
    }

    /* Content Cards */
    .df-card {
        background-color: #FFFFFF;
        border: 1px solid #E2E8F0;
        border-radius: 8px;
        padding: 1.5rem;
        margin-bottom: 1.25rem;
        box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.03);
    }
    .df-card-subtle {
        background-color: #F8FAFC;
        border: 1px solid #E2E8F0;
        border-radius: 8px;
        padding: 1.25rem;
        margin-bottom: 1.25rem;
    }

    /* Showcase Strip */
    .showcase-strip {
        background: #F8FAFC;
        border: 1px solid #E2E8F0;
        border-radius: 8px;
        padding: 1.25rem;
        margin: 1.5rem 0;
    }

    /* Digit Display Frame */
    .digit-frame {
        background-color: #FFFFFF;
        border: 1px solid #E2E8F0;
        border-radius: 8px;
        padding: 0.5rem;
        text-align: center;
        transition: border-color 0.15s ease;
    }
    .digit-frame:hover {
        border-color: #CBD5E1;
    }

    /* Minimal Badges */
    .pill-badge {
        display: inline-block;
        background: #F1F5F9;
        color: #475569;
        font-size: 0.78rem;
        font-weight: 500;
        padding: 0.2rem 0.6rem;
        border-radius: 6px;
        margin-right: 0.4rem;
        margin-bottom: 0.4rem;
        border: 1px solid #E2E8F0;
    }

    /* Status Dot */
    .status-dot {
        display: inline-block;
        width: 8px;
        height: 8px;
        background-color: #16A34A;
        border-radius: 50%;
        margin-right: 6px;
    }

    /* Sidebar Brand */
    .sidebar-brand-title {
        font-size: 1rem;
        font-weight: 700;
        letter-spacing: -0.01em;
        color: #172033;
    }
    .sidebar-brand-subtitle {
        font-size: 0.78rem;
        color: #64748B;
        font-weight: 500;
    }

    /* Streamlit Widget Polish */
    div[data-testid="stRadio"] > div {
        gap: 4px;
    }
    div[data-testid="stRadio"] label {
        font-size: 0.88rem;
        font-weight: 500;
        color: #475569;
        padding: 0.35rem 0.65rem;
        border-radius: 6px;
        transition: background 0.15s ease;
    }

    /* Button Enhancements */
    button[kind="primary"] {
        background-color: #4F46E5 !important;
        border: none !important;
        font-weight: 500 !important;
        border-radius: 6px !important;
        transition: background-color 0.15s ease !important;
    }
    button[kind="primary"]:hover {
        background-color: #4338CA !important;
    }
    button[kind="secondary"] {
        background-color: #FFFFFF !important;
        border: 1px solid #E2E8F0 !important;
        color: #172033 !important;
        border-radius: 6px !important;
        font-weight: 500 !important;
    }
    button[kind="secondary"]:hover {
        background-color: #F8FAFC !important;
        border-color: #CBD5E1 !important;
    }
    </style>
    """,
    unsafe_allow_html=True,
)


# -----------------------------------------------------------------------------
# 3. Cached Model & Resources
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
# 4. Clean Sidebar Navigation
# -----------------------------------------------------------------------------
with st.sidebar:
    st.markdown(
        """
        <div style="padding: 0.25rem 0 0.75rem 0;">
            <div style="display: flex; align-items: center; gap: 8px;">
                <div style="width: 24px; height: 24px; background: #4F46E5; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 13px;">D</div>
                <span class="sidebar-brand-title">DIGITFORGE</span>
            </div>
            <div class="sidebar-brand-subtitle" style="margin-left: 32px; margin-top: -2px;">Generative AI Studio</div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    st.markdown("<div style='height: 0.5rem;'></div>", unsafe_allow_html=True)

    nav_options = [
        "Overview",
        "Generate",
        "Latent Explorer",
        "Model Insights",
        "About",
    ]

    if "nav_page" not in st.session_state:
        st.session_state["nav_page"] = "Overview"

    current_index = nav_options.index(st.session_state["nav_page"]) if st.session_state["nav_page"] in nav_options else 0

    selected_nav = st.radio(
        label="Navigation Menu",
        options=nav_options,
        index=current_index,
        label_visibility="collapsed",
        key="main_nav_radio",
    )
    st.session_state["nav_page"] = selected_nav

    st.markdown("<div style='height: 1.5rem;'></div>", unsafe_allow_html=True)

    # Minimal Status Card
    st.markdown(
        """
        <div style="border-top: 1px solid #E2E8F0; padding-top: 1rem; margin-top: 1rem;">
            <span style="font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; color: #94A3B8; font-weight: 600;">System Status</span>
        </div>
        """,
        unsafe_allow_html=True,
    )

    if model_obj is not None:
        device_str = "Apple Silicon (MPS)" if device_obj and device_obj.type == "mps" else (
            "CUDA GPU" if device_obj and device_obj.type == "cuda" else "CPU"
        )
        st.markdown(
            f"""
            <div style="margin-top: 0.4rem; font-size: 0.82rem; color: #172033; font-weight: 500;">
                <span class="status-dot"></span>Model Ready
            </div>
            <div style="font-size: 0.75rem; color: #64748B; margin-top: 2px;">
                Device: {device_str}<br>
                Latent: {model_obj.latent_dim}D Gaussian
            </div>
            """,
            unsafe_allow_html=True,
        )
    else:
        st.markdown(
            """
            <div style="margin-top: 0.4rem; font-size: 0.82rem; color: #DC2626; font-weight: 500;">
                <span style="display:inline-block; width:8px; height:8px; background:#DC2626; border-radius:50%; margin-right:6px;"></span>No Checkpoint
            </div>
            <div style="font-size: 0.75rem; color: #64748B; margin-top: 2px;">
                Run <code>python train.py</code> to train.
            </div>
            """,
            unsafe_allow_html=True,
        )

    st.markdown(
        """
        <div style="position: absolute; bottom: 1.5rem; font-size: 0.75rem; color: #94A3B8;">
            DigitForge v1.0 • Academic AI Studio
        </div>
        """,
        unsafe_allow_html=True,
    )


# -----------------------------------------------------------------------------
# PAGE 1: OVERVIEW (HOME)
# -----------------------------------------------------------------------------
if st.session_state["nav_page"] == "Overview":
    # Hero Section
    st.markdown(
        """
        <div class="hero-container">
            <div class="hero-badge">Conditional Variational Autoencoder</div>
            <div class="hero-title">DigitForge</div>
            <div style="font-size: 1.35rem; font-weight: 500; color: #172033; margin-bottom: 0.75rem;">
                Generate handwritten digits with Generative AI.
            </div>
            <div class="hero-desc">
                An interactive exploration of Conditional Variational Autoencoders, trained on the MNIST dataset to generate synthetic handwritten digits.
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    cta_col1, cta_col2, _ = st.columns([1.5, 1.5, 4])
    with cta_col1:
        if st.button("Start Generating →", type="primary", use_container_width=True):
            st.session_state["nav_page"] = "Generate"
            st.rerun()
    with cta_col2:
        if st.button("Explore Latent Space", type="secondary", use_container_width=True):
            st.session_state["nav_page"] = "Latent Explorer"
            st.rerun()

    st.markdown("<div style='height: 1.5rem;'></div>", unsafe_allow_html=True)

    # Visual Preview of Generated Handwritten Digits
    st.markdown("### Synthetic Sample Preview")
    st.caption("Live samples generated directly by the trained CVAE across all digit classes (0 to 9).")

    if model_obj is not None:
        # Generate 1 sample for each digit 0-9 to display in a clean horizontal preview row
        with torch.no_grad():
            sample_tensors = []
            for d in range(10):
                # Fixed seed for consistent, pristine preview row
                z_preview = torch.zeros(1, model_obj.latent_dim, device=device_obj)
                img = model_obj.sample(num_samples=1, digit=d, device=device_obj, custom_z=z_preview)
                sample_tensors.append(img)

        preview_cols = st.columns(10)
        for idx in range(10):
            with preview_cols[idx]:
                pil_thumb = tensor_to_pil(sample_tensors[idx][0])
                st.markdown(
                    f"""
                    <div class="digit-frame">
                        <div style="font-size: 0.72rem; color: #64748B; font-weight: 600; margin-bottom: 4px;">Class {idx}</div>
                    </div>
                    """,
                    unsafe_allow_html=True,
                )
                st.image(pil_thumb, width=95)
    else:
        st.info("Train the model with `python train.py` to enable live synthetic preview.")

    st.markdown("<div style='height: 1.5rem;'></div>", unsafe_allow_html=True)

    # Core Architectural Pillars
    st.markdown("### How Conditional VAE Works")
    p1, p2, p3 = st.columns(3)

    with p1:
        st.markdown(
            """
            <div class="df-card">
                <h4 style="margin-top:0; font-size: 1rem; color:#172033;">1. Class Conditioning</h4>
                <p style="font-size: 0.88rem; color:#64748B; margin-bottom: 0;">
                    Unlike unconditional VAEs that produce random digits, DigitForge feeds one-hot digit vectors into both
                    the encoder and decoder to ensure targeted synthesis on demand.
                </p>
            </div>
            """,
            unsafe_allow_html=True,
        )

    with p2:
        st.markdown(
            """
            <div class="df-card">
                <h4 style="margin-top:0; font-size: 1rem; color:#172033;">2. Continuous Latent Space</h4>
                <p style="font-size: 0.88rem; color:#64748B; margin-bottom: 0;">
                    A 16-dimensional bottleneck regularized by Kullback-Leibler divergence enforces a smooth
                    Gaussian prior, allowing seamless sampling and interpolation.
                </p>
            </div>
            """,
            unsafe_allow_html=True,
        )

    with p3:
        st.markdown(
            """
            <div class="df-card">
                <h4 style="margin-top:0; font-size: 1rem; color:#172033;">3. Reparameterization</h4>
                <p style="font-size: 0.88rem; color:#64748B; margin-bottom: 0;">
                    Stochasticity is isolated into auxiliary noise ε ~ N(0, I), enabling exact gradient
                    propagation through the probabilistic bottleneck during training.
                </p>
            </div>
            """,
            unsafe_allow_html=True,
        )

    st.markdown("<div style='height: 1rem;'></div>", unsafe_allow_html=True)

    # Technology Stack
    st.markdown("### Technology Stack")
    st.markdown(
        """
        <div>
            <span class="pill-badge">Python 3.14</span>
            <span class="pill-badge">PyTorch 2.15</span>
            <span class="pill-badge">Apple MPS Acceleration</span>
            <span class="pill-badge">Torchvision</span>
            <span class="pill-badge">Streamlit 1.67</span>
            <span class="pill-badge">NumPy</span>
            <span class="pill-badge">Matplotlib</span>
            <span class="pill-badge">Pillow</span>
        </div>
        """,
        unsafe_allow_html=True,
    )


# -----------------------------------------------------------------------------
# PAGE 2: GENERATE (MAIN PRODUCT FOCUS)
# -----------------------------------------------------------------------------
elif st.session_state["nav_page"] == "Generate":
    st.markdown(
        """
        <div style="margin-bottom: 1.5rem;">
            <h2>Handwritten Digit Generator</h2>
            <p style="color: #64748B; margin-bottom: 0;">
                Condition the generative decoder on any digit (0–9) to synthesize novel handwritten variations from standard Gaussian latent noise.
            </p>
        </div>
        """,
        unsafe_allow_html=True,
    )

    if model_obj is None:
        st.error(
            "Model checkpoint not found at `saved_model/cvae_mnist.pth`.\n\n"
            "Please run `python train.py` from your terminal to train the model on MNIST."
        )
    else:
        # Clean Control Bar
        with st.container():
            st.markdown(
                """
                <div class="df-card-subtle" style="padding: 1rem 1.25rem 0.5rem 1.25rem;">
                """,
                unsafe_allow_html=True,
            )

            c_digit, c_count, c_btn = st.columns([2.5, 2.5, 2])

            with c_digit:
                selected_digit = st.selectbox(
                    "Target Digit:",
                    options=list(range(10)),
                    index=7,
                    help="Conditional class label fed to decoder.",
                )

            with c_count:
                num_samples = st.selectbox(
                    "Sample Count:",
                    options=[5, 10, 20],
                    index=1,
                    help="Number of distinct variations to sample.",
                )

            with c_btn:
                st.markdown("<div style='height: 1.7rem;'></div>", unsafe_allow_html=True)
                btn_generate = st.button("Generate Digits", type="primary", use_container_width=True)

            st.markdown("</div>", unsafe_allow_html=True)

        # Sampling Logic
        if "gen_tensor_cache" not in st.session_state or btn_generate:
            with st.spinner("Synthesizing handwritten samples..."):
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
            st.markdown("<div style='height: 1rem;'></div>", unsafe_allow_html=True)

            # Output Canvas Header
            head_col, regen_col = st.columns([4, 1.2])
            with head_col:
                st.markdown(
                    f"""
                    <div style="font-size: 1.1rem; font-weight: 600; color: #172033;">
                        Generated Variations for Digit '{cached_digit}'
                    </div>
                    <div style="font-size: 0.82rem; color: #64748B;">
                        Showing {cached_count} synthetic instances • Sampled from standard normal latent distribution.
                    </div>
                    """,
                    unsafe_allow_html=True,
                )
            with regen_col:
                if st.button("Generate Again", type="secondary", use_container_width=True):
                    with torch.no_grad():
                        st.session_state["gen_tensor_cache"] = model_obj.sample(
                            num_samples=cached_count,
                            digit=cached_digit,
                            device=device_obj,
                        )
                    st.session_state["cached_time"] = time.strftime("%H:%M:%S")
                    st.rerun()

            st.markdown("<div style='height: 0.75rem;'></div>", unsafe_allow_html=True)

            # Clean Display Grid
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
                                <div class="digit-frame">
                                    <div style="font-size: 0.72rem; color: #64748B; font-weight: 500; margin-bottom: 2px;">
                                        Sample #{s_idx + 1}
                                    </div>
                                </div>
                                """,
                                unsafe_allow_html=True,
                            )
                            st.image(pil_img, width=110)

                            # Minimalist individual download
                            buf = io.BytesIO()
                            pil_img.save(buf, format="PNG")
                            st.download_button(
                                label="Download PNG",
                                data=buf.getvalue(),
                                file_name=f"digit_{cached_digit}_sample_{s_idx + 1}.png",
                                mime="image/png",
                                key=f"dl_single_{s_idx}_{st.session_state.get('cached_time', '')}",
                                use_container_width=True,
                            )

            st.markdown("<div style='height: 1.5rem;'></div>", unsafe_allow_html=True)

            # Composite Grid Export
            st.markdown(
                """
                <div class="df-card" style="display: flex; align-items: center; justify-content: space-between;">
                    <div>
                        <div style="font-weight: 600; color: #172033; font-size: 0.95rem;">Export Complete Sample Grid</div>
                        <div style="font-size: 0.82rem; color: #64748B;">Download all generated variations as a single high-resolution composite PNG.</div>
                    </div>
                </div>
                """,
                unsafe_allow_html=True,
            )

            fig = plot_generated_digits_grid(
                current_tensors,
                digit=cached_digit,
                ncols=min(5, cached_count),
            )
            grid_buf = io.BytesIO()
            fig.savefig(grid_buf, format="PNG", bbox_inches="tight", dpi=200)
            plt.close(fig)

            st.download_button(
                label=f"Download Full Grid PNG ({cached_count} samples)",
                data=grid_buf.getvalue(),
                file_name=f"digitforge_{cached_digit}_{cached_count}_grid.png",
                mime="image/png",
                type="secondary",
            )


# -----------------------------------------------------------------------------
# PAGE 3: LATENT EXPLORER
# -----------------------------------------------------------------------------
elif st.session_state["nav_page"] == "Latent Explorer":
    st.markdown(
        """
        <div style="margin-bottom: 1.5rem;">
            <h2>Latent Space Explorer</h2>
            <p style="color: #64748B; margin-bottom: 0;">
                Adjust individual latent coordinates while holding the conditioned digit constant to observe how continuous vectors shape visual stroke properties.
            </p>
        </div>
        """,
        unsafe_allow_html=True,
    )

    if model_obj is None:
        st.error("Model checkpoint not found. Please train with `python train.py` first.")
    else:
        latent_dim = model_obj.latent_dim

        # Explorer Top Bar
        top_c1, top_c2, top_c3 = st.columns([2.5, 2, 2])
        with top_c1:
            explorer_digit = st.selectbox(
                "Conditioned Digit Class:",
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
            if st.button("Reset to Mean (0.0)", type="secondary", use_container_width=True):
                for d in range(latent_dim):
                    st.session_state[f"z_val_{d}"] = 0.0
                st.rerun()

        # Initialize session state for sliders
        for d in range(latent_dim):
            if f"z_val_{d}" not in st.session_state:
                st.session_state[f"z_val_{d}"] = 0.0

        st.markdown("<div style='height: 1rem;'></div>", unsafe_allow_html=True)

        # 2-Column Layout: Sliders (Left) vs Large Preview (Right)
        slider_side, preview_side = st.columns([3.2, 2.2])

        with slider_side:
            st.markdown(
                """
                <div class="df-card-subtle">
                    <div style="font-weight: 600; color: #172033; font-size: 0.95rem; margin-bottom: 0.25rem;">
                        Latent Coordinates (z ∈ [-3.0, +3.0])
                    </div>
                    <div style="font-size: 0.8rem; color: #64748B; margin-bottom: 1rem;">
                        99.7% of Gaussian prior mass lies within ±3.0 standard deviations.
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
                        f"z_{d}",
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
                    <div style="font-weight: 600; color: #172033; font-size: 0.95rem; margin-bottom: 0.75rem;">
                        Decoded Output Canvas
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

            # Instant Download
            dl_buf = io.BytesIO()
            pil_custom.save(dl_buf, format="PNG")
            st.download_button(
                label="Download Sample PNG",
                data=dl_buf.getvalue(),
                file_name=f"latent_digit_{explorer_digit}.png",
                mime="image/png",
                type="secondary",
                use_container_width=True,
            )

            st.markdown(
                f"""
                <div style="text-align: left; font-size: 0.82rem; color: #64748B; line-height: 1.5; margin-top: 1rem; border-top: 1px solid #E2E8F0; padding-top: 0.75rem;">
                    <strong>Latent Manifold:</strong> Holding class '{explorer_digit}' fixed while shifting coordinates traverses the continuous latent space, altering stroke angle, thickness, and closure without changing digit class.
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
        <div style="margin-bottom: 1.5rem;">
            <h2>Model Insights & Training Analysis</h2>
            <p style="color: #64748B; margin-bottom: 0;">
                Detailed architectural formulation, loss equations, and empirical convergence history.
            </p>
        </div>
        """,
        unsafe_allow_html=True,
    )

    tab_edu, tab_curves = st.tabs([
        "Architecture & Formulation",
        "Empirical Training History",
    ])

    with tab_edu:
        st.markdown(
            """
            <div class="df-card">
                <h3 style="margin-top: 0;">What is Generative AI?</h3>
                <p>
                    Unlike discriminative algorithms that compute conditional class probabilities P(Y|X) to categorize images,
                    Generative AI learns to approximate the underlying joint probability distribution P(X, Y).
                    By modeling this distribution, the network can sample novel, synthetic instances that follow the same statistical structure as authentic training data.
                </p>
            </div>

            <div class="df-card">
                <h3 style="margin-top: 0;">What is a Conditional Variational Autoencoder (CVAE)?</h3>
                <p>
                    A standard VAE models an unconstrained generative distribution P(X). While it maps images into a smooth Gaussian prior,
                    it cannot target specific classes on demand.
                    A <strong>Conditional VAE</strong> introduces conditioning variable Y (a 10-dimensional one-hot label for digits 0–9)
                    to both the inference network Q<sub>φ</sub>(Z|X, Y) and generative network P<sub>θ</sub>(X|Z, Y).
                    This structure guarantees direct categorical control over synthesis.
                </p>
            </div>
            """,
            unsafe_allow_html=True,
        )

        c_enc, c_dec = st.columns(2)
        with c_enc:
            st.markdown(
                """
                <div class="df-card-subtle">
                    <h4 style="margin-top: 0; color: #172033;">Encoder (Inference Network)</h4>
                    <ul style="font-size: 0.88rem; color: #475569; padding-left: 1.2rem;">
                        <li><strong>Input:</strong> Concatenates flattened 28×28 image (784 dims) + one-hot label (10 dims) = <strong>794 dims</strong>.</li>
                        <li><strong>Hidden Layers:</strong> 794 → 512 → 256 with LeakyReLU(0.2).</li>
                        <li><strong>Outputs:</strong> Mean vector μ (16D) and log-variance log(σ²) (16D).</li>
                    </ul>
                </div>
                """,
                unsafe_allow_html=True,
            )

        with c_dec:
            st.markdown(
                """
                <div class="df-card-subtle">
                    <h4 style="margin-top: 0; color: #172033;">Decoder (Generative Network)</h4>
                    <ul style="font-size: 0.88rem; color: #475569; padding-left: 1.2rem;">
                        <li><strong>Input:</strong> Concatenates sampled latent vector z (16 dims) + one-hot label (10 dims) = <strong>26 dims</strong>.</li>
                        <li><strong>Hidden Layers:</strong> 26 → 256 → 512 with LeakyReLU(0.2).</li>
                        <li><strong>Output:</strong> 512 → 784 with Sigmoid activation strictly bounding pixel intensities to [0.0, 1.0].</li>
                    </ul>
                </div>
                """,
                unsafe_allow_html=True,
            )

        st.markdown(
            """
            <div class="df-card">
                <h3 style="margin-top: 0;">The Reparameterization Trick</h3>
                <p>
                    Direct stochastic sampling z ~ N(μ, σ²) contains non-differentiable nodes, breaking backpropagation.
                    The reparameterization trick isolates stochasticity by sampling standard normal noise ε ~ N(0, I) and computing:
                </p>
                <div style="background:#F1F5F9; border-radius:6px; padding:0.75rem 1rem; font-family:monospace; font-size:0.9rem; color:#172033; margin: 0.5rem 0;">
                    z = μ + σ ⊙ ε = μ + exp(0.5 · log_var) ⊙ ε
                </div>
                <p style="margin-bottom: 0;">
                    Because ε is independent of model parameters, gradients flow directly from loss to encoder weights through μ and σ.
                </p>
            </div>

            <div class="df-card">
                <h3 style="margin-top: 0;">Loss Function: Evidence Lower Bound (ELBO)</h3>
                <p>
                    Training minimizes the negative ELBO, composed of two complementary loss terms:
                </p>
                <ul style="font-size: 0.9rem; color: #475569; padding-left: 1.2rem;">
                    <li><strong>Reconstruction Loss (Binary Cross Entropy):</strong> Measures pixel-level accuracy between decoded image x̂ and ground truth x across all 784 pixels.</li>
                    <li><strong>Kullback-Leibler (KL) Divergence:</strong> Measures divergence between variational posterior Q(Z|X, Y) and prior N(0, I), preventing posterior collapse and ensuring smooth sampling.</li>
                </ul>
            </div>
            """,
            unsafe_allow_html=True,
        )

    with tab_curves:
        history_data = load_training_history(HISTORY_PATH)

        if history_data is None:
            st.info("No training history file found. Run `python train.py` to record loss curves.")
        else:
            epochs_count = len(history_data.get("train_total_loss", []))
            final_val = history_data.get("val_total_loss", [-1])[-1]
            final_bce = history_data.get("train_recon_loss", [-1])[-1]
            final_kl = history_data.get("train_kl_loss", [-1])[-1]

            m1, m2, m3, m4 = st.columns(4)
            with m1:
                st.metric("Total Epochs", f"{epochs_count}")
            with m2:
                st.metric("Final Val Loss", f"{final_val:.2f}")
            with m3:
                st.metric("Final BCE Loss", f"{final_bce:.2f}")
            with m4:
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
        <div style="margin-bottom: 1.5rem;">
            <h2>About DigitForge</h2>
            <p style="color: #64748B; margin-bottom: 0;">
                Academic documentation, methodology, and technical specifications.
            </p>
        </div>
        """,
        unsafe_allow_html=True,
    )

    st.markdown(
        """
        <div class="df-card">
            <h3 style="margin-top:0;">1. Project Description</h3>
            <p>
                <strong>DigitForge</strong> is an academic Generative AI mini-project developed for final-year B.Tech Computer Science & Engineering.
                It formulates, trains, and verifies a Conditional Variational Autoencoder (CVAE) from scratch in PyTorch
                to synthesize realistic handwritten digits conditioned on target labels from 0 to 9.
            </p>
        </div>

        <div class="df-card">
            <h3 style="margin-top:0;">2. Problem Statement</h3>
            <p>
                Traditional deep learning classifiers excel at mapping images to categories, but cannot synthesize new instances.
                Standard Variational Autoencoders generate images from a Gaussian prior, but lack categorical control.
                DigitForge resolves this limitation by conditioning both the probabilistic inference network and generative network on class labels,
                enabling targeted, controllable handwritten digit generation on demand.
            </p>
        </div>

        <div class="df-card">
            <h3 style="margin-top:0;">3. Objectives</h3>
            <ul style="font-size:0.92rem; color:#475569; padding-left:1.2rem;">
                <li>Implement a genuine Conditional Variational Autoencoder from scratch in PyTorch.</li>
                <li>Train and validate on the 70,000-sample MNIST benchmark dataset.</li>
                <li>Enable class-conditioned synthetic handwritten digit synthesis for digits 0–9.</li>
                <li>Provide continuous 16-dimensional latent space exploration.</li>
                <li>Deploy an accessible, modern AI product interface using Streamlit.</li>
            </ul>
        </div>

        <div class="df-card">
            <h3 style="margin-top:0;">4. Methodology</h3>
            <ol style="font-size:0.92rem; color:#475569; padding-left:1.2rem;">
                <li><strong>Dataset Preprocessing:</strong> 60,000 training and 10,000 testing images scaled to [0.0, 1.0].</li>
                <li><strong>Network Architecture:</strong> Fully connected encoder (794 → 512 → 256) predicting μ and log(σ²), followed by decoder (26 → 256 → 512 → 784) with Sigmoid activation.</li>
                <li><strong>Reparameterization Trick:</strong> Enabling backpropagation through Gaussian latent sampling.</li>
                <li><strong>Joint Optimization:</strong> Adam optimizer minimizing Binary Cross Entropy and KL divergence.</li>
            </ol>
        </div>

        <div class="df-card">
            <h3 style="margin-top:0;">5. Dataset Information</h3>
            <p>
                The <strong>MNIST</strong> (Modified National Institute of Standards and Technology) dataset contains:
            </p>
            <ul style="font-size:0.92rem; color:#475569; padding-left:1.2rem;">
                <li>70,000 total 28×28 grayscale images (60,000 train, 10,000 test).</li>
                <li>10 balanced digit categories (0 to 9).</li>
                <li>Standard benchmark for density estimation and generative modeling.</li>
            </ul>
        </div>

        <div class="df-card">
            <h3 style="margin-top:0;">6. Future Scope</h3>
            <ul style="font-size:0.92rem; color:#475569; padding-left:1.2rem;">
                <li><strong>Convolutional CVAE:</strong> Implementing transposed convolutions to better capture spatial stroke relationships.</li>
                <li><strong>Diffusion Models:</strong> Extending class-conditioning to Denoising Diffusion Probabilistic Models (DDPM).</li>
                <li><strong>High-Resolution Extensions:</strong> Training on color or higher-resolution character datasets such as Omniglot and SVHN.</li>
            </ul>
        </div>
        """,
        unsafe_allow_html=True,
    )
