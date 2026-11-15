"""DigitForge - Dataset Loading and Preprocessing Pipeline.

Handles downloading, normalizing, and creating PyTorch DataLoaders
for the MNIST handwritten digit dataset.
"""

import os
from typing import Tuple
from torch.utils.data import DataLoader
from torchvision import datasets, transforms


def get_mnist_dataloaders(
    data_dir: str = "dataset",
    batch_size: int = 128,
    num_workers: int = 0,
    download: bool = True,
) -> Tuple[DataLoader, DataLoader]:
    """Load MNIST training and testing datasets and wrap in DataLoaders.

    Transformations:
    - transforms.ToTensor(): Converts PIL Image with pixel values [0, 255]
      to torch.FloatTensor of shape [1, 28, 28] scaled to [0.0, 1.0].
      This matches the sigmoid activation output of the CVAE decoder
      and is required for Binary Cross Entropy (BCE) loss.

    Args:
        data_dir: Directory where the dataset files will be stored.
        batch_size: Mini-batch size for training and evaluation.
        num_workers: Subprocesses to use for data loading (0 for main thread).
        download: Whether to download MNIST if not found locally.

    Returns:
        Tuple of (train_loader, test_loader).
    """
    os.makedirs(data_dir, exist_ok=True)

    transform = transforms.Compose([
        transforms.ToTensor(),
    ])

    train_dataset = datasets.MNIST(
        root=data_dir,
        train=True,
        download=download,
        transform=transform,
    )

    test_dataset = datasets.MNIST(
        root=data_dir,
        train=False,
        download=download,
        transform=transform,
    )

    train_loader = DataLoader(
        train_dataset,
        batch_size=batch_size,
        shuffle=True,
        num_workers=num_workers,
        pin_memory=False,
    )

    test_loader = DataLoader(
        test_dataset,
        batch_size=batch_size,
        shuffle=False,
        num_workers=num_workers,
        pin_memory=False,
    )

    return train_loader, test_loader
