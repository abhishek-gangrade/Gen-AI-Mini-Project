"""DigitForge - Conditional Variational Autoencoder (CVAE) Training Pipeline.

Trains the CVAE on the MNIST handwritten digits dataset using PyTorch.
Tracks total loss, reconstruction loss (BCE), and KL divergence across epochs.
Saves the best model checkpoint to 'saved_model/cvae_mnist.pth' and
loss history to 'training_history/loss_history.json'.

Usage:
    python train.py
    python train.py --epochs 30 --batch-size 128 --lr 0.001 --latent-dim 16
"""

import os
os.environ.setdefault("MPLCONFIGDIR", "/tmp/matplotlib")
import sys
import time
import argparse
from typing import Dict, List, Any
import torch
import torch.optim as optim

# Ensure project root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from models.cvae import CVAE, cvae_loss_function
from utils.dataset import get_mnist_dataloaders
from utils.helpers import (
    get_device,
    save_checkpoint,
    save_training_history,
)


def train_one_epoch(
    model: CVAE,
    dataloader: torch.utils.data.DataLoader,
    optimizer: optim.Optimizer,
    device: torch.device,
) -> Dict[str, float]:
    """Train the CVAE model for a single epoch.

    Args:
        model: CVAE model instance.
        dataloader: PyTorch DataLoader for MNIST training set.
        optimizer: Optimizer instance (e.g. Adam).
        device: Device to run computations on.

    Returns:
        Dictionary containing average train total loss, recon loss, and KL loss per sample.
    """
    model.train()
    running_total_loss = 0.0
    running_recon_loss = 0.0
    running_kl_loss = 0.0
    total_samples = 0

    for batch_idx, (data, targets) in enumerate(dataloader):
        data = data.to(device)
        targets = targets.to(device)
        batch_size = data.size(0)

        optimizer.zero_grad()
        recon_batch, mu, log_var = model(data, targets)
        loss, recon_loss, kl_loss = cvae_loss_function(recon_batch, data, mu, log_var)

        loss.backward()
        optimizer.step()

        running_total_loss += loss.item() * batch_size
        running_recon_loss += recon_loss.item() * batch_size
        running_kl_loss += kl_loss.item() * batch_size
        total_samples += batch_size

    return {
        "total_loss": running_total_loss / total_samples,
        "recon_loss": running_recon_loss / total_samples,
        "kl_loss": running_kl_loss / total_samples,
    }


def evaluate(
    model: CVAE,
    dataloader: torch.utils.data.DataLoader,
    device: torch.device,
) -> Dict[str, float]:
    """Evaluate CVAE on the validation/test set.

    Args:
        model: CVAE model instance.
        dataloader: PyTorch DataLoader for MNIST test set.
        device: Device to run computations on.

    Returns:
        Dictionary containing average validation total loss, recon loss, and KL loss per sample.
    """
    model.eval()
    running_total_loss = 0.0
    running_recon_loss = 0.0
    running_kl_loss = 0.0
    total_samples = 0

    with torch.no_grad():
        for data, targets in dataloader:
            data = data.to(device)
            targets = targets.to(device)
            batch_size = data.size(0)

            recon_batch, mu, log_var = model(data, targets)
            loss, recon_loss, kl_loss = cvae_loss_function(recon_batch, data, mu, log_var)

            running_total_loss += loss.item() * batch_size
            running_recon_loss += recon_loss.item() * batch_size
            running_kl_loss += kl_loss.item() * batch_size
            total_samples += batch_size

    return {
        "total_loss": running_total_loss / total_samples,
        "recon_loss": running_recon_loss / total_samples,
        "kl_loss": running_kl_loss / total_samples,
    }


def train(
    epochs: int = 30,
    batch_size: int = 128,
    lr: float = 0.001,
    latent_dim: int = 16,
    device_name: str = "auto",
    data_dir: str = "dataset",
    model_save_path: str = "saved_model/cvae_mnist.pth",
    history_save_path: str = "training_history/loss_history.json",
) -> Dict[str, Any]:
    """Execute complete CVAE training and validation pipeline.

    Args:
        epochs: Number of training epochs (default 30).
        batch_size: Mini-batch size (default 128).
        lr: Learning rate for Adam optimizer (default 0.001).
        latent_dim: Dimension of latent space z (default 16).
        device_name: 'auto', 'mps', 'cuda', or 'cpu'.
        data_dir: Root path for MNIST dataset.
        model_save_path: Destination path for best model weights.
        history_save_path: Destination path for loss curves JSON.

    Returns:
        Dictionary containing training history and metadata.
    """
    # 1. Device detection
    if device_name == "auto":
        device = get_device(prefer_mps=True)
    elif device_name in ["mps", "cuda", "cpu"]:
        device = torch.device(device_name)
    else:
        device = get_device(prefer_mps=True)

    print("=" * 70)
    print("  DIGITFORGE: CVAE TRAINING PIPELINE")
    print("=" * 70)
    print(f"Device:           {device.type.upper()} ({device})")
    print(f"Epochs:           {epochs}")
    print(f"Batch Size:       {batch_size}")
    print(f"Learning Rate:    {lr}")
    print(f"Latent Dimension: {latent_dim}")
    print(f"Dataset Path:     {data_dir}")
    print(f"Checkpoint Path:  {model_save_path}")
    print(f"History Path:     {history_save_path}")
    print("-" * 70)

    # 2. Dataset Loading
    print("Loading MNIST dataset...")
    train_loader, test_loader = get_mnist_dataloaders(
        data_dir=data_dir,
        batch_size=batch_size,
        download=True,
    )
    print(f"Training samples:   {len(train_loader.dataset):,}")
    print(f"Validation samples: {len(test_loader.dataset):,}")
    print("-" * 70)

    # 3. Model & Optimizer Initialization
    model = CVAE(
        input_dim=784,
        num_classes=10,
        latent_dim=latent_dim,
        hidden_dims=(512, 256),
    ).to(device)

    optimizer = optim.Adam(model.parameters(), lr=lr)

    history: Dict[str, List[float]] = {
        "train_total_loss": [],
        "train_recon_loss": [],
        "train_kl_loss": [],
        "val_total_loss": [],
        "val_recon_loss": [],
        "val_kl_loss": [],
    }

    best_val_loss = float("inf")
    start_time = time.time()

    # 4. Training Loop
    print(f"{'Epoch':<8}{'Train Total':<13}{'Train Recon':<13}{'Train KL':<12}{'Val Total':<13}{'Val Recon':<13}{'Val KL':<10}{'Time':<8}")
    print("-" * 88)

    for epoch in range(1, epochs + 1):
        epoch_start = time.time()

        train_metrics = train_one_epoch(model, train_loader, optimizer, device)
        val_metrics = evaluate(model, test_loader, device)

        epoch_duration = time.time() - epoch_start

        # Record history
        history["train_total_loss"].append(round(train_metrics["total_loss"], 4))
        history["train_recon_loss"].append(round(train_metrics["recon_loss"], 4))
        history["train_kl_loss"].append(round(train_metrics["kl_loss"], 4))
        history["val_total_loss"].append(round(val_metrics["total_loss"], 4))
        history["val_recon_loss"].append(round(val_metrics["recon_loss"], 4))
        history["val_kl_loss"].append(round(val_metrics["kl_loss"], 4))

        is_best = val_metrics["total_loss"] < best_val_loss
        marker = " (*)" if is_best else ""

        print(
            f"{epoch:<8}"
            f"{train_metrics['total_loss']:<13.2f}"
            f"{train_metrics['recon_loss']:<13.2f}"
            f"{train_metrics['kl_loss']:<12.2f}"
            f"{val_metrics['total_loss']:<13.2f}"
            f"{val_metrics['recon_loss']:<13.2f}"
            f"{val_metrics['kl_loss']:<10.2f}"
            f"{epoch_duration:.1f}s{marker}"
        )

        if is_best:
            best_val_loss = val_metrics["total_loss"]
            save_checkpoint(
                model=model,
                optimizer=optimizer,
                epoch=epoch,
                train_loss=train_metrics["total_loss"],
                val_loss=val_metrics["total_loss"],
                filepath=model_save_path,
                config={
                    "input_dim": 784,
                    "num_classes": 10,
                    "latent_dim": latent_dim,
                    "hidden_dims": [512, 256],
                    "best_epoch": epoch,
                },
            )

    total_duration = time.time() - start_time
    print("-" * 88)
    print(f"Training completed in {total_duration:.1f}s ({total_duration/60:.2f} min).")
    print(f"Best Validation Loss: {best_val_loss:.2f} saved to '{model_save_path}'.")

    # 5. Save History
    save_training_history(history, history_save_path)
    print(f"Training history saved to '{history_save_path}'.")
    print("=" * 70)

    return history


def main():
    """Parse command line arguments and execute training."""
    parser = argparse.ArgumentParser(description="Train DigitForge CVAE on MNIST.")
    parser.add_argument("--epochs", type=int, default=30, help="Number of epochs (default: 30)")
    parser.add_argument("--batch-size", type=int, default=128, help="Batch size (default: 128)")
    parser.add_argument("--lr", type=float, default=0.001, help="Learning rate (default: 0.001)")
    parser.add_argument("--latent-dim", type=int, default=16, help="Latent dimension (default: 16)")
    parser.add_argument("--device", type=str, default="auto", choices=["auto", "mps", "cuda", "cpu"], help="Device to use")
    parser.add_argument("--data-dir", type=str, default="dataset", help="Directory for MNIST data")
    parser.add_argument("--save-path", type=str, default="saved_model/cvae_mnist.pth", help="Model checkpoint path")
    parser.add_argument("--history-path", type=str, default="training_history/loss_history.json", help="Loss history path")

    args = parser.parse_args()

    train(
        epochs=args.epochs,
        batch_size=args.batch_size,
        lr=args.lr,
        latent_dim=args.latent_dim,
        device_name=args.device,
        data_dir=args.data_dir,
        model_save_path=args.save_path,
        history_save_path=args.history_path,
    )


if __name__ == "__main__":
    main()
