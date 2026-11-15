"""DigitForge - Image Visualization and Plotting Utilities.

Provides functions to display, convert, format, and save generated
handwritten digits and training loss curves.
"""

import os
import io
from typing import Optional, Dict, Any, List
import matplotlib
os.environ.setdefault("MPLCONFIGDIR", "/tmp/matplotlib")
matplotlib.use("Agg")  # Non-interactive backend for server/Streamlit safety
import matplotlib.pyplot as plt
import numpy as np
import torch
from PIL import Image


def tensor_to_pil(tensor: torch.Tensor) -> Image.Image:
    """Convert a single PyTorch image tensor [1, 28, 28] or [28, 28] to a PIL Image.

    Args:
        tensor: Grayscale image tensor with values in [0, 1].

    Returns:
        PIL Image in mode 'L' (8-bit grayscale).
    """
    if tensor.dim() == 3:
        tensor = tensor.squeeze(0)  # [28, 28]
    elif tensor.dim() == 4:
        tensor = tensor.squeeze()

    np_img = tensor.detach().cpu().numpy()
    np_img = np.clip(np_img * 255.0, 0, 255).astype(np.uint8)
    return Image.fromarray(np_img, mode="L")


def figure_to_pil(fig: plt.Figure) -> Image.Image:
    """Convert a Matplotlib figure into a PIL Image.

    Args:
        fig: Matplotlib Figure instance.

    Returns:
        PIL Image representation of the figure.
    """
    buf = io.BytesIO()
    fig.savefig(buf, format="png", bbox_inches="tight", dpi=180)
    buf.seek(0)
    image = Image.open(buf)
    # Load into memory before closing buffer
    image.load()
    buf.close()
    return image


def plot_generated_digits_grid(
    images: torch.Tensor,
    digit: int,
    ncols: int = 5,
    title: Optional[str] = None,
) -> plt.Figure:
    """Plot a grid of generated digit images using Matplotlib.

    Args:
        images: Tensor of generated images of shape [num_samples, 1, 28, 28].
        digit: The conditioned digit class (0-9).
        ncols: Number of columns in the grid.
        title: Optional custom plot title.

    Returns:
        Matplotlib Figure object.
    """
    num_samples = images.size(0)
    nrows = int(np.ceil(num_samples / ncols))

    fig, axes = plt.subplots(
        nrows,
        ncols,
        figsize=(ncols * 1.6, nrows * 1.6 + 0.4),
        facecolor="#F8FAFC",
    )

    if nrows == 1 and ncols == 1:
        axes = np.array([[axes]])
    elif nrows == 1:
        axes = np.expand_dims(axes, 0)
    elif ncols == 1:
        axes = np.expand_dims(axes, 1)

    fig_title = title or f"DigitForge Synthetic Samples for Digit '{digit}'"
    fig.suptitle(
        fig_title,
        fontsize=13,
        fontweight="bold",
        color="#1E293B",
        y=0.98,
    )

    for idx in range(nrows * ncols):
        r, c = divmod(idx, ncols)
        ax = axes[r, c]
        if idx < num_samples:
            img = images[idx].squeeze().detach().cpu().numpy()
            ax.imshow(img, cmap="gray", vmin=0.0, vmax=1.0, interpolation="nearest")
            ax.set_title(f"Sample #{idx + 1}", fontsize=8, color="#475569")
        ax.axis("off")

    plt.tight_layout()
    return fig


def save_tensor_image(tensor: torch.Tensor, filepath: str) -> str:
    """Save a single image tensor to disk as PNG.

    Args:
        tensor: Image tensor of shape [1, 28, 28] or [28, 28].
        filepath: Target output file path.

    Returns:
        The normalized path to the saved image.
    """
    os.makedirs(os.path.dirname(os.path.abspath(filepath)), exist_ok=True)
    pil_img = tensor_to_pil(tensor)
    pil_img.save(filepath, format="PNG")
    return filepath


def save_digit_grid_image(
    images: torch.Tensor,
    filepath: str,
    digit: int,
    ncols: int = 5,
) -> str:
    """Save an entire grid of generated images to disk as a single composite PNG.

    Args:
        images: Tensor of shape [num_samples, 1, 28, 28].
        filepath: Target output file path.
        digit: Conditioned digit.
        ncols: Columns in composite grid.

    Returns:
        Path to saved composite PNG.
    """
    os.makedirs(os.path.dirname(os.path.abspath(filepath)), exist_ok=True)
    fig = plot_generated_digits_grid(images, digit=digit, ncols=ncols)
    fig.savefig(filepath, format="PNG", bbox_inches="tight", dpi=200)
    plt.close(fig)
    return filepath


def plot_training_history(history: Dict[str, List[float]]) -> plt.Figure:
    """Plot multi-panel training and validation loss curves.

    Panels:
    1. Total Loss (Train vs Test).
    2. Reconstruction Loss (BCE).
    3. KL Divergence.

    Args:
        history: Dictionary containing lists of losses per epoch.

    Returns:
        Matplotlib Figure object.
    """
    epochs = list(range(1, len(history.get("train_total_loss", [])) + 1))

    fig, axes = plt.subplots(1, 3, figsize=(16, 4.5), facecolor="#F8FAFC")

    # Styling colors
    color_primary = "#4F46E5"    # Indigo
    color_secondary = "#06B6D4"  # Cyan
    color_accent = "#8B5CF6"     # Purple
    color_validation = "#F43F5E" # Rose

    # 1. Total Loss
    axes[0].plot(
        epochs,
        history.get("train_total_loss", []),
        label="Train Total Loss",
        color=color_primary,
        linewidth=2,
    )
    if "val_total_loss" in history and history["val_total_loss"]:
        axes[0].plot(
            epochs,
            history["val_total_loss"],
            label="Val Total Loss",
            color=color_validation,
            linestyle="--",
            linewidth=2,
        )
    axes[0].set_title("Total CVAE Loss", fontsize=11, fontweight="bold", color="#1E293B")
    axes[0].set_xlabel("Epoch", fontsize=10, color="#475569")
    axes[0].set_ylabel("Loss / Sample", fontsize=10, color="#475569")
    axes[0].grid(True, linestyle=":", alpha=0.6)
    axes[0].legend(frameon=True, facecolor="white", edgecolor="#CBD5E1")

    # 2. Reconstruction Loss
    axes[1].plot(
        epochs,
        history.get("train_recon_loss", []),
        label="Train Recon Loss (BCE)",
        color=color_secondary,
        linewidth=2,
    )
    if "val_recon_loss" in history and history["val_recon_loss"]:
        axes[1].plot(
            epochs,
            history["val_recon_loss"],
            label="Val Recon Loss",
            color=color_validation,
            linestyle="--",
            linewidth=2,
        )
    axes[1].set_title("Reconstruction Loss (BCE)", fontsize=11, fontweight="bold", color="#1E293B")
    axes[1].set_xlabel("Epoch", fontsize=10, color="#475569")
    axes[1].set_ylabel("BCE Loss / Sample", fontsize=10, color="#475569")
    axes[1].grid(True, linestyle=":", alpha=0.6)
    axes[1].legend(frameon=True, facecolor="white", edgecolor="#CBD5E1")

    # 3. KL Divergence
    axes[2].plot(
        epochs,
        history.get("train_kl_loss", []),
        label="Train KL Divergence",
        color=color_accent,
        linewidth=2,
    )
    if "val_kl_loss" in history and history["val_kl_loss"]:
        axes[2].plot(
            epochs,
            history["val_kl_loss"],
            label="Val KL Divergence",
            color=color_validation,
            linestyle="--",
            linewidth=2,
        )
    axes[2].set_title("KL Divergence", fontsize=11, fontweight="bold", color="#1E293B")
    axes[2].set_xlabel("Epoch", fontsize=10, color="#475569")
    axes[2].set_ylabel("KL Loss / Sample", fontsize=10, color="#475569")
    axes[2].grid(True, linestyle=":", alpha=0.6)
    axes[2].legend(frameon=True, facecolor="white", edgecolor="#CBD5E1")

    fig.suptitle(
        "DigitForge CVAE Training Progression and Convergence",
        fontsize=13,
        fontweight="bold",
        color="#1E293B",
        y=1.03,
    )
    plt.tight_layout()
    return fig
