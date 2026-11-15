"""DigitForge - Device Detection, Model Persistence, and Helper Utilities."""

import os
import json
from typing import Dict, Any, Tuple, Optional
import torch
from models.cvae import CVAE


def get_device(prefer_mps: bool = True) -> torch.device:
    """Detect and return the best available PyTorch computation device.

    Priority order:
    1. Apple Silicon MPS (Metal Performance Shaders) if on Mac and supported.
    2. NVIDIA CUDA GPU if available.
    3. CPU fallback.

    Args:
        prefer_mps: Whether to use Apple MPS when available (default True).

    Returns:
        torch.device instance.
    """
    if prefer_mps and torch.backends.mps.is_available():
        try:
            # Simple probe to ensure MPS driver is responsive
            _ = torch.zeros(1, device="mps")
            return torch.device("mps")
        except Exception:
            pass

    if torch.cuda.is_available():
        return torch.device("cuda")

    return torch.device("cpu")


def save_checkpoint(
    model: torch.nn.Module,
    optimizer: Optional[torch.optim.Optimizer],
    epoch: int,
    train_loss: float,
    val_loss: float,
    filepath: str,
    config: Optional[Dict[str, Any]] = None,
) -> None:
    """Save model checkpoint and metadata to disk.

    Args:
        model: Trained PyTorch model.
        optimizer: PyTorch optimizer (optional).
        epoch: Epoch index reached.
        train_loss: Final training loss at checkpoint.
        val_loss: Validation loss at checkpoint.
        filepath: Destination file path (e.g. saved_model/cvae_mnist.pth).
        config: Model hyperparameters and architecture config.
    """
    os.makedirs(os.path.dirname(os.path.abspath(filepath)), exist_ok=True)

    state = {
        "epoch": epoch,
        "model_state_dict": model.state_dict(),
        "optimizer_state_dict": optimizer.state_dict() if optimizer else None,
        "train_loss": train_loss,
        "val_loss": val_loss,
        "config": config or {
            "input_dim": getattr(model, "input_dim", 784),
            "num_classes": getattr(model, "num_classes", 10),
            "latent_dim": getattr(model, "latent_dim", 16),
            "hidden_dims": getattr(model, "hidden_dims", (512, 256)),
        },
    }
    torch.save(state, filepath)


def load_checkpoint(
    filepath: str,
    device: Optional[torch.device] = None,
    model: Optional[CVAE] = None,
) -> Tuple[CVAE, Dict[str, Any]]:
    """Load CVAE model weights and metadata from a checkpoint file.

    Args:
        filepath: Path to saved .pth checkpoint.
        device: Device to place the model on (defaults to get_device()).
        model: Optional existing CVAE instance. If None, one will be constructed
               using the configuration saved in the checkpoint.

    Returns:
        Tuple of (model in eval mode, checkpoint metadata dict).

    Raises:
        FileNotFoundError: If checkpoint does not exist.
        RuntimeError: If checkpoint is corrupt or incompatible.
    """
    if not os.path.exists(filepath):
        raise FileNotFoundError(
            f"Checkpoint file not found at '{filepath}'. "
            f"Please run 'python train.py' to train the CVAE model first."
        )

    if device is None:
        device = get_device()

    checkpoint = torch.load(filepath, map_location=device)

    config = checkpoint.get("config", {
        "input_dim": 784,
        "num_classes": 10,
        "latent_dim": 16,
        "hidden_dims": (512, 256),
    })

    if model is None:
        model = CVAE(
            input_dim=config.get("input_dim", 784),
            num_classes=config.get("num_classes", 10),
            latent_dim=config.get("latent_dim", 16),
            hidden_dims=tuple(config.get("hidden_dims", (512, 256))),
        )

    model.load_state_dict(checkpoint["model_state_dict"])
    model.to(device)
    model.eval()

    metadata = {
        "epoch": checkpoint.get("epoch", 0),
        "train_loss": checkpoint.get("train_loss", 0.0),
        "val_loss": checkpoint.get("val_loss", 0.0),
        "config": config,
    }
    return model, metadata


def save_training_history(history: Dict[str, Any], filepath: str) -> None:
    """Save training metric curves to a JSON file.

    Args:
        history: Dictionary containing lists of epoch-by-epoch loss metrics.
        filepath: Path to save the JSON output (e.g. training_history/loss_history.json).
    """
    os.makedirs(os.path.dirname(os.path.abspath(filepath)), exist_ok=True)
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(history, f, indent=2)


def load_training_history(filepath: str) -> Optional[Dict[str, Any]]:
    """Load training metric curves from a JSON file.

    Args:
        filepath: Path to the JSON file.

    Returns:
        History dictionary if file exists, else None.
    """
    if not os.path.exists(filepath):
        return None
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None
