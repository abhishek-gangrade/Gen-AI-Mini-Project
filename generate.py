"""DigitForge - Handwritten Digit Generation Module.

Provides reusable generation routines that load the trained CVAE model,
sample random latent vectors from standard Gaussian noise, condition on
the target digit class (0-9), decode into 28x28 grayscale images,
and save outputs as PNG files.

Usage:
    python generate.py --digit 7 --samples 10 --save
"""

import os
os.environ.setdefault("MPLCONFIGDIR", "/tmp/matplotlib")
import sys
import argparse
from typing import Tuple, List, Optional
import torch
from PIL import Image

# Ensure project root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from models.cvae import CVAE
from utils.helpers import get_device, load_checkpoint
from utils.visualization import (
    tensor_to_pil,
    save_tensor_image,
    save_digit_grid_image,
)


def load_generator(
    checkpoint_path: str = "saved_model/cvae_mnist.pth",
    device: Optional[torch.device] = None,
) -> Tuple[CVAE, torch.device]:
    """Load the trained CVAE generator model from checkpoint.

    Args:
        checkpoint_path: Path to .pth checkpoint.
        device: PyTorch device (auto-detected if None).

    Returns:
        Tuple of (model in eval mode, device).

    Raises:
        FileNotFoundError: If checkpoint file does not exist.
    """
    if device is None:
        device = get_device()
    model, _ = load_checkpoint(checkpoint_path, device=device)
    return model, device


def generate_digits(
    digit: int,
    num_samples: int = 10,
    model: Optional[CVAE] = None,
    checkpoint_path: str = "saved_model/cvae_mnist.pth",
    device: Optional[torch.device] = None,
    custom_z: Optional[torch.Tensor] = None,
) -> torch.Tensor:
    """Generate synthetic handwritten digit images for a specific digit class.

    Each generation request uses fresh standard Gaussian latent samples N(0, I)
    unless custom latent vectors are provided.

    Args:
        digit: Target digit class to generate (integer 0 through 9).
        num_samples: Number of distinct variations to produce (e.g. 5, 10, 20).
        model: Optional pre-loaded CVAE model.
        checkpoint_path: Checkpoint path if model needs to be loaded.
        device: Device to run generation on.
        custom_z: Optional custom latent tensor of shape [num_samples, latent_dim].

    Returns:
        Generated image tensor of shape [num_samples, 1, 28, 28] with values in [0.0, 1.0].

    Raises:
        ValueError: If digit is not in range [0, 9] or num_samples <= 0.
        FileNotFoundError: If checkpoint is missing.
    """
    if not isinstance(digit, int) or not (0 <= digit <= 9):
        raise ValueError(f"Target digit must be an integer between 0 and 9. Received: {digit}")

    if num_samples <= 0:
        raise ValueError(f"Number of samples must be positive. Received: {num_samples}")

    if model is None:
        model, device = load_generator(checkpoint_path, device=device)
    elif device is None:
        device = next(model.parameters()).device

    # Use model's sample method with fresh standard normal noise
    with torch.no_grad():
        images = model.sample(
            num_samples=num_samples,
            digit=digit,
            device=device,
            custom_z=custom_z,
        )

    return images


def save_generated_outputs(
    images: torch.Tensor,
    digit: int,
    output_dir: str = "outputs",
    save_individual: bool = True,
    save_grid: bool = True,
) -> Tuple[List[str], Optional[str]]:
    """Save generated image tensor samples to disk as PNG files.

    Args:
        images: Tensor of shape [num_samples, 1, 28, 28].
        digit: The conditioned digit class.
        output_dir: Root destination folder for outputs.
        save_individual: Whether to save each sample as its own PNG file.
        save_grid: Whether to save composite grid image as PNG.

    Returns:
        Tuple of (list_of_individual_image_paths, grid_image_path).
    """
    os.makedirs(output_dir, exist_ok=True)
    num_samples = images.size(0)
    saved_paths: List[str] = []
    grid_path: Optional[str] = None

    if save_individual:
        digit_dir = os.path.join(output_dir, f"digit_{digit}")
        os.makedirs(digit_dir, exist_ok=True)
        for idx in range(num_samples):
            img_path = os.path.join(digit_dir, f"sample_{idx + 1}.png")
            save_tensor_image(images[idx], img_path)
            saved_paths.append(img_path)

    if save_grid:
        grid_path = os.path.join(output_dir, f"digit_{digit}_grid_{num_samples}samples.png")
        save_digit_grid_image(images, filepath=grid_path, digit=digit, ncols=min(5, num_samples))

    return saved_paths, grid_path


def main():
    """Command line entry point for generation."""
    parser = argparse.ArgumentParser(description="DigitForge: Generate Handwritten Digits.")
    parser.add_argument("--digit", type=int, required=True, choices=range(0, 10), help="Digit to generate (0-9)")
    parser.add_argument("--samples", type=int, default=10, choices=[5, 10, 20], help="Number of samples (5, 10, 20)")
    parser.add_argument("--checkpoint", type=str, default="saved_model/cvae_mnist.pth", help="Model checkpoint path")
    parser.add_argument("--outdir", type=str, default="outputs", help="Output directory")
    parser.add_argument("--save", action="store_true", default=True, help="Save outputs to disk")

    args = parser.parse_args()

    print(f"Generating {args.samples} synthetic variations of digit '{args.digit}'...")
    images = generate_digits(
        digit=args.digit,
        num_samples=args.samples,
        checkpoint_path=args.checkpoint,
    )

    print(f"Generated tensor shape: {images.shape}")
    print(f"Value range: min={images.min().item():.3f}, max={images.max().item():.3f}")

    if args.save:
        indiv_paths, grid_path = save_generated_outputs(images, digit=args.digit, output_dir=args.outdir)
        print(f"Saved {len(indiv_paths)} individual samples to {args.outdir}/digit_{args.digit}/")
        if grid_path:
            print(f"Saved grid image to {grid_path}")


if __name__ == "__main__":
    main()
