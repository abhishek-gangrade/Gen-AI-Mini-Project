"""DigitForge - Conditional Variational Autoencoder (CVAE) Architecture.

This module implements a genuine Conditional Variational Autoencoder (CVAE)
designed for handwritten digit generation (MNIST).

Architecture overview:
1. Encoder:
   - Input: Flattened image (784-dim) concatenated with one-hot class label (10-dim) = 794-dim.
   - Hidden layers: 794 -> 512 -> 256 with LeakyReLU activations.
   - Latent parameters: Linear projections to Mean (mu) and Log-Variance (log_var) of size `latent_dim`.
2. Reparameterization Trick:
   - Samples standard Gaussian noise epsilon ~ N(0, I).
   - Computes z = mu + std * epsilon, where std = exp(0.5 * log_var).
   - Allows backpropagation through stochastic sampling.
3. Decoder:
   - Input: Latent representation z (16-dim) concatenated with one-hot label (10-dim) = 26-dim.
   - Hidden layers: 26 -> 256 -> 512 with LeakyReLU activations.
   - Output: 512 -> 784 with Sigmoid activation, reshaped to (B, 1, 28, 28).
4. Loss Function:
   - Total Loss = Reconstruction Loss (BCE) + KL Divergence.
   - Balances reconstruction fidelity against latent distribution regularization.
"""

from typing import Tuple, Union
import torch
import torch.nn as nn
import torch.nn.functional as F


def to_one_hot(
    labels: Union[torch.Tensor, int],
    num_classes: int = 10,
    device: torch.device = torch.device("cpu"),
) -> torch.Tensor:
    """Convert integer class label(s) to a one-hot encoded tensor.

    Args:
        labels: Tensor of class indices [batch_size] or an integer.
        num_classes: Total number of classes (default 10 for MNIST).
        device: Target torch device.

    Returns:
        One-hot encoded tensor of shape [batch_size, num_classes] as float32.
    """
    if isinstance(labels, int):
        labels = torch.tensor([labels], dtype=torch.long, device=device)
    elif not isinstance(labels, torch.Tensor):
        labels = torch.tensor(labels, dtype=torch.long, device=device)
    else:
        labels = labels.to(device=device, dtype=torch.long)

    if labels.dim() == 0:
        labels = labels.unsqueeze(0)

    # If already one-hot encoded
    if labels.dim() == 2 and labels.size(-1) == num_classes:
        return labels.to(dtype=torch.float32, device=device)

    one_hot = F.one_hot(labels, num_classes=num_classes).to(dtype=torch.float32)
    return one_hot


class CVAE(nn.Module):
    """Conditional Variational Autoencoder (CVAE) for MNIST handwritten digits.

    Conditioned on digit class label (0 to 9) to enable targeted synthetic generation.
    """

    def __init__(
        self,
        input_dim: int = 784,
        num_classes: int = 10,
        latent_dim: int = 16,
        hidden_dims: Tuple[int, int] = (512, 256),
    ):
        """Initialize the CVAE model.

        Args:
            input_dim: Dimensionality of flattened input images (28 * 28 = 784).
            num_classes: Number of distinct digit classes (10 for MNIST, 0-9).
            latent_dim: Dimensionality of the latent space representation (default 16).
            hidden_dims: Dimensions of encoder hidden layers (reversed for decoder).
        """
        super().__init__()
        self.input_dim = input_dim
        self.num_classes = num_classes
        self.latent_dim = latent_dim
        self.hidden_dims = hidden_dims

        # -----------------------------
        # 1. ENCODER
        # -----------------------------
        # Input: Flattened image + One-hot label
        enc_in_dim = input_dim + num_classes
        h1, h2 = hidden_dims

        self.encoder_fc1 = nn.Linear(enc_in_dim, h1)
        self.encoder_fc2 = nn.Linear(h1, h2)
        self.fc_mu = nn.Linear(h2, latent_dim)
        self.fc_log_var = nn.Linear(h2, latent_dim)

        # -----------------------------
        # 2. DECODER
        # -----------------------------
        # Input: Latent vector + One-hot label
        dec_in_dim = latent_dim + num_classes
        self.decoder_fc1 = nn.Linear(dec_in_dim, h2)
        self.decoder_fc2 = nn.Linear(h2, h1)
        self.decoder_out = nn.Linear(h1, input_dim)

        self.activation = nn.LeakyReLU(0.2)

    def encode(
        self, x: torch.Tensor, y_one_hot: torch.Tensor
    ) -> Tuple[torch.Tensor, torch.Tensor]:
        """Encode input image and condition into latent distribution parameters.

        Args:
            x: Input image tensor of shape [batch_size, 1, 28, 28] or [batch_size, 784].
            y_one_hot: One-hot encoded labels of shape [batch_size, num_classes].

        Returns:
            Tuple of (mu, log_var), each of shape [batch_size, latent_dim].
        """
        x_flat = x.view(-1, self.input_dim)
        combined = torch.cat([x_flat, y_one_hot], dim=1)

        h = self.activation(self.encoder_fc1(combined))
        h = self.activation(self.encoder_fc2(h))

        mu = self.fc_mu(h)
        log_var = self.fc_log_var(h)
        return mu, log_var

    def reparameterize(
        self, mu: torch.Tensor, log_var: torch.Tensor
    ) -> torch.Tensor:
        """Apply the reparameterization trick to sample latent vectors.

        Formula:
            z = mu + std * epsilon
            where std = exp(0.5 * log_var), epsilon ~ N(0, I)

        Args:
            mu: Mean vector [batch_size, latent_dim].
            log_var: Log variance vector [batch_size, latent_dim].

        Returns:
            Sampled latent vector z [batch_size, latent_dim].
        """
        if self.training:
            std = torch.exp(0.5 * log_var)
            eps = torch.randn_like(std)
            return mu + eps * std
        else:
            # During evaluation, return mean directly if deterministic evaluation is desired,
            # or sample if exploring stochasticity.
            std = torch.exp(0.5 * log_var)
            eps = torch.randn_like(std)
            return mu + eps * std

    def decode(
        self, z: torch.Tensor, y_one_hot: torch.Tensor
    ) -> torch.Tensor:
        """Decode latent vector conditioned on class label into reconstructed image.

        Args:
            z: Latent vector [batch_size, latent_dim].
            y_one_hot: One-hot encoded label [batch_size, num_classes].

        Returns:
            Reconstructed image tensor of shape [batch_size, 1, 28, 28],
            with pixel values in [0, 1] via Sigmoid.
        """
        combined = torch.cat([z, y_one_hot], dim=1)
        h = self.activation(self.decoder_fc1(combined))
        h = self.activation(self.decoder_fc2(h))
        x_recon_flat = torch.sigmoid(self.decoder_out(h))
        x_recon = x_recon_flat.view(-1, 1, 28, 28)
        return x_recon

    def forward(
        self, x: torch.Tensor, y: torch.Tensor
    ) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        """Perform full CVAE forward pass.

        Args:
            x: Input images [batch_size, 1, 28, 28].
            y: Integer labels [batch_size] or one-hot [batch_size, num_classes].

        Returns:
            Tuple of:
            - x_recon: Reconstructed images [batch_size, 1, 28, 28].
            - mu: Latent mean [batch_size, latent_dim].
            - log_var: Latent log variance [batch_size, latent_dim].
        """
        y_one_hot = to_one_hot(y, self.num_classes, device=x.device)
        mu, log_var = self.encode(x, y_one_hot)
        z = self.reparameterize(mu, log_var)
        x_recon = self.decode(z, y_one_hot)
        return x_recon, mu, log_var

    @torch.no_grad()
    def sample(
        self,
        num_samples: int,
        digit: int,
        device: torch.device = torch.device("cpu"),
        custom_z: torch.Tensor = None,
    ) -> torch.Tensor:
        """Sample synthetic digit images conditioned on a specific digit class.

        Args:
            num_samples: Number of digit images to generate.
            digit: The target digit class (0 through 9).
            device: Torch execution device.
            custom_z: Optional pre-defined latent tensor of shape [num_samples, latent_dim].

        Returns:
            Generated image tensor of shape [num_samples, 1, 28, 28] with values in [0, 1].
        """
        if not (0 <= digit <= 9):
            raise ValueError(f"Digit must be between 0 and 9, got {digit}.")

        self.eval()

        if custom_z is not None:
            z = custom_z.to(device=device, dtype=torch.float32)
            if z.dim() == 1:
                z = z.unsqueeze(0)
            if z.size(0) != num_samples:
                num_samples = z.size(0)
        else:
            z = torch.randn(num_samples, self.latent_dim, device=device)

        labels = torch.full((num_samples,), digit, dtype=torch.long, device=device)
        y_one_hot = to_one_hot(labels, self.num_classes, device=device)
        generated_images = self.decode(z, y_one_hot)
        return generated_images


def cvae_loss_function(
    x_recon: torch.Tensor,
    x: torch.Tensor,
    mu: torch.Tensor,
    log_var: torch.Tensor,
    beta: float = 1.0,
) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
    """Compute the Conditional Variational Autoencoder Loss.

    Objective:
        Total Loss = Reconstruction Loss + beta * KL Divergence

    Components:
    1. Reconstruction Loss:
       Measures how accurately the decoder reproduces input pixels.
       Uses Binary Cross Entropy (BCE) summed across all 784 pixels per sample,
       averaged over the mini-batch:
       BCE = - sum_{i=1}^{784} [ x_i * log(x̂_i) + (1 - x_i) * log(1 - x̂_i) ]

    2. Kullback-Leibler (KL) Divergence:
       Measures divergence between the approximate posterior q(z|x, y) = N(mu, diag(exp(log_var)))
       and the standard Gaussian prior p(z) = N(0, I):
       KL = -0.5 * sum_{j=1}^{latent_dim} [ 1 + log_var_j - mu_j^2 - exp(log_var_j) ]

    Both terms are summed per-sample and then averaged across the batch to ensure
    consistent scaling independent of batch size.

    Args:
        x_recon: Decoded reconstruction [batch_size, 1, 28, 28].
        x: Ground truth input [batch_size, 1, 28, 28].
        mu: Latent distribution mean [batch_size, latent_dim].
        log_var: Latent distribution log variance [batch_size, latent_dim].
        beta: Weighting factor for KL divergence (default 1.0).

    Returns:
        Tuple of (total_loss, recon_loss, kl_divergence).
    """
    batch_size = x.size(0)

    # 1. Reconstruction Loss (Binary Cross Entropy)
    # Sum over 784 pixels per sample, then average across batch
    recon_loss_sum = F.binary_cross_entropy(
        x_recon.view(-1, 784),
        x.view(-1, 784),
        reduction="sum",
    )
    recon_loss = recon_loss_sum / batch_size

    # 2. KL Divergence
    # Analytical solution for KL divergence between N(mu, sigma^2) and N(0, 1)
    # Sum over latent dimensions per sample, then average across batch
    kl_sum = -0.5 * torch.sum(1 + log_var - mu.pow(2) - log_var.exp())
    kl_loss = kl_sum / batch_size

    # Total loss
    total_loss = recon_loss + beta * kl_loss

    return total_loss, recon_loss, kl_loss
