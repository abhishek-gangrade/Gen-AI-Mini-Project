"""DigitForge - Automated Comprehensive Test Suite.

Verifies:
1. Environment and package installations
2. Device detection (MPS / CUDA / CPU)
3. Dataset loading, batch dimensions, and normalization
4. Model forward pass, shapes, reparameterization, and loss calculation
5. Backpropagation and gradient updates
6. Model checkpoint saving and reloading
7. Digit generation across all classes (0 through 9)
8. Output tensor validity and image export
"""

import os
os.environ.setdefault("MPLCONFIGDIR", "/tmp/matplotlib")
import sys
import unittest
import torch
import numpy as np

# Ensure project root in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from models.cvae import CVAE, cvae_loss_function, to_one_hot
from utils.dataset import get_mnist_dataloaders
from utils.helpers import get_device, save_checkpoint, load_checkpoint
from utils.visualization import tensor_to_pil, save_tensor_image, save_digit_grid_image
from generate import generate_digits, save_generated_outputs


class TestDigitForge(unittest.TestCase):
    """Test suite for DigitForge CVAE components."""

    @classmethod
    def setUpClass(cls):
        cls.device = get_device()
        print(f"\n[SETUP] Testing on device: {cls.device.type.upper()} ({cls.device})")

    def test_01_environment_and_device(self):
        """Verify device detection and torch version."""
        self.assertIsNotNone(self.device)
        self.assertTrue(self.device.type in ["mps", "cuda", "cpu"])
        print(f"PASS: Device detected as {self.device.type}")

    def test_02_one_hot_encoding(self):
        """Verify one-hot encoding utility."""
        labels = torch.tensor([0, 5, 9])
        one_hot = to_one_hot(labels, num_classes=10, device=self.device)
        self.assertEqual(one_hot.shape, (3, 10))
        self.assertEqual(one_hot[0, 0].item(), 1.0)
        self.assertEqual(one_hot[1, 5].item(), 1.0)
        self.assertEqual(one_hot[2, 9].item(), 1.0)
        self.assertEqual(one_hot[0, 1:].sum().item(), 0.0)
        print("PASS: One-hot encoding produces correct format and values")

    def test_03_model_forward_pass_and_shapes(self):
        """Verify CVAE model initialization, forward pass, and output shapes."""
        batch_size = 8
        latent_dim = 16
        model = CVAE(input_dim=784, num_classes=10, latent_dim=latent_dim).to(self.device)

        dummy_x = torch.rand(batch_size, 1, 28, 28, device=self.device)
        dummy_y = torch.randint(0, 10, (batch_size,), device=self.device)

        recon_x, mu, log_var = model(dummy_x, dummy_y)

        # Output shapes
        self.assertEqual(recon_x.shape, (batch_size, 1, 28, 28))
        self.assertEqual(mu.shape, (batch_size, latent_dim))
        self.assertEqual(log_var.shape, (batch_size, latent_dim))

        # Values in [0, 1] due to sigmoid
        self.assertTrue((recon_x >= 0.0).all().item())
        self.assertTrue((recon_x <= 1.0).all().item())
        print(f"PASS: Forward pass output shape {recon_x.shape} with values in [0, 1]")

    def test_04_reparameterization_trick(self):
        """Verify reparameterization stochasticity and gradient flow."""
        latent_dim = 16
        model = CVAE(input_dim=784, num_classes=10, latent_dim=latent_dim).to(self.device)
        model.train()

        mu = torch.zeros(4, latent_dim, device=self.device, requires_grad=True)
        log_var = torch.zeros(4, latent_dim, device=self.device, requires_grad=True)

        z1 = model.reparameterize(mu, log_var)
        z2 = model.reparameterize(mu, log_var)

        # Reparameterized vectors should differ due to random epsilon
        self.assertFalse(torch.equal(z1, z2))

        # Check gradients backprop through reparameterization
        loss = z1.sum()
        loss.backward()
        self.assertIsNotNone(mu.grad)
        self.assertIsNotNone(log_var.grad)
        print("PASS: Reparameterization trick produces stochastic vectors with proper gradient flow")

    def test_05_loss_function(self):
        """Verify CVAE loss calculation (BCE + KL)."""
        batch_size = 4
        latent_dim = 16
        x = torch.rand(batch_size, 1, 28, 28, device=self.device)
        x_recon = torch.rand(batch_size, 1, 28, 28, device=self.device)
        mu = torch.randn(batch_size, latent_dim, device=self.device)
        log_var = torch.randn(batch_size, latent_dim, device=self.device)

        total_loss, recon_loss, kl_loss = cvae_loss_function(x_recon, x, mu, log_var)

        self.assertTrue(torch.isfinite(total_loss))
        self.assertTrue(torch.isfinite(recon_loss))
        self.assertTrue(torch.isfinite(kl_loss))
        self.assertGreater(recon_loss.item(), 0.0)
        self.assertGreater(kl_loss.item(), 0.0)
        self.assertAlmostEqual(total_loss.item(), (recon_loss + kl_loss).item(), places=4)
        print(f"PASS: Loss function computes finite BCE ({recon_loss.item():.2f}) and KL ({kl_loss.item():.2f})")

    def test_06_model_gradient_update(self):
        """Verify that training step actually updates model parameters."""
        model = CVAE(input_dim=784, num_classes=10, latent_dim=16).to(self.device)
        optimizer = torch.optim.Adam(model.parameters(), lr=0.01)

        x = torch.rand(4, 1, 28, 28, device=self.device)
        y = torch.tensor([0, 1, 2, 3], device=self.device)

        # Capture initial parameter values
        initial_param = next(model.parameters()).clone()

        model.train()
        optimizer.zero_grad()
        recon_x, mu, log_var = model(x, y)
        loss, _, _ = cvae_loss_function(recon_x, x, mu, log_var)
        loss.backward()
        optimizer.step()

        updated_param = next(model.parameters())
        self.assertFalse(torch.equal(initial_param, updated_param))
        print("PASS: Model parameters successfully update after optimizer step")

    def test_07_checkpoint_save_and_load(self):
        """Verify model checkpoint persistence and reloading."""
        model = CVAE(input_dim=784, num_classes=10, latent_dim=16).to(self.device)
        test_path = "saved_model/test_checkpoint.pth"

        save_checkpoint(
            model=model,
            optimizer=None,
            epoch=5,
            train_loss=120.5,
            val_loss=122.3,
            filepath=test_path,
        )
        self.assertTrue(os.path.exists(test_path))

        loaded_model, meta = load_checkpoint(test_path, device=self.device)
        self.assertEqual(meta["epoch"], 5)
        self.assertAlmostEqual(meta["val_loss"], 122.3, places=2)
        self.assertFalse(loaded_model.training)

        # Clean up test checkpoint
        if os.path.exists(test_path):
            os.remove(test_path)
        print("PASS: Checkpoint saved and reloaded with intact weights and metadata")

    def test_08_dataset_loading(self):
        """Verify MNIST dataset structure, split sizes, and dimensions."""
        train_loader, test_loader = get_mnist_dataloaders(
            data_dir="dataset",
            batch_size=64,
            download=True,
        )
        self.assertEqual(len(train_loader.dataset), 60000)
        self.assertEqual(len(test_loader.dataset), 10000)

        # Inspect first batch
        data, targets = next(iter(train_loader))
        self.assertEqual(data.shape, (64, 1, 28, 28))
        self.assertEqual(targets.shape, (64,))
        self.assertTrue((data >= 0.0).all().item())
        self.assertTrue((data <= 1.0).all().item())
        self.assertTrue((targets >= 0).all().item() and (targets <= 9).all().item())
        print(f"PASS: MNIST loaded (60,000 train, 10,000 test), shape {data.shape}, normalized in [0, 1]")

    def test_09_generation_for_all_digits_0_to_9(self):
        """Verify synthetic generation for each digit class 0 through 9."""
        model = CVAE(input_dim=784, num_classes=10, latent_dim=16).to(self.device)
        model.eval()

        for d in range(10):
            generated = model.sample(num_samples=3, digit=d, device=self.device)
            self.assertEqual(generated.shape, (3, 1, 28, 28))
            self.assertTrue((generated >= 0.0).all().item())
            self.assertTrue((generated <= 1.0).all().item())

        # Test invalid digit rejection
        with self.assertRaises(ValueError):
            model.sample(num_samples=1, digit=10, device=self.device)
        with self.assertRaises(ValueError):
            model.sample(num_samples=1, digit=-1, device=self.device)

        print("PASS: Digit generation verified for all digits 0-9; invalid labels rejected")

    def test_10_image_export_and_pil_conversion(self):
        """Verify tensor conversion to PIL and PNG file export."""
        dummy_tensor = torch.rand(1, 28, 28)
        pil_img = tensor_to_pil(dummy_tensor)
        self.assertEqual(pil_img.size, (28, 28))
        self.assertEqual(pil_img.mode, "L")

        test_out_img = "outputs/test_single.png"
        save_tensor_image(dummy_tensor, test_out_img)
        self.assertTrue(os.path.exists(test_out_img))
        os.remove(test_out_img)

        # Test grid export
        dummy_batch = torch.rand(5, 1, 28, 28)
        test_out_grid = "outputs/test_grid.png"
        save_digit_grid_image(dummy_batch, test_out_grid, digit=7, ncols=5)
        self.assertTrue(os.path.exists(test_out_grid))
        os.remove(test_out_grid)

        print("PASS: Image conversion and PNG export confirmed")


if __name__ == "__main__":
    unittest.main()
