# DigitForge: AI-Based Handwritten Digit Generation Using Conditional Variational Autoencoder (CVAE)

> **Final-Year B.Tech Computer Science & Engineering Academic Mini-Project**  
> **Course:** Generative AI / Deep Learning  
> **Framework:** PyTorch & Streamlit  

---

## 1. Project Introduction

**DigitForge** is a complete, self-contained Generative AI application designed to learn complex handwritten digit representations from the classic MNIST dataset and synthesize high-quality, diverse synthetic handwritten digits on demand.

Unlike standard unconditional generative models where output identity is random, DigitForge implements a **Conditional Variational Autoencoder (CVAE)**. Conditioning the neural network on class labels allows users to select any digit from **0 through 9** and produce multiple distinct, realistic variations with diverse handwriting strokes, angles, and line thicknesses.

The project features:
- A genuine PyTorch CVAE trained from scratch.
- Continuous 16-dimensional latent space exploration.
- An interactive, academic-grade Streamlit web dashboard.
- Full offline support with automatic device detection (Apple Silicon MPS, CUDA, CPU).

---

## 2. Problem Statement

Standard autoencoders compress input images into a deterministic latent bottleneck and reconstruct them. However, their latent spaces contain arbitrary gaps and "holes", making sampling of random vectors for new image synthesis ineffective (often yielding blurry, unrecognizable artifacts).

While standard Variational Autoencoders (VAEs) enforce a smooth standard Gaussian prior $\mathcal{N}(\mathbf{0}, \mathbf{I})$ over the latent space to allow random sampling, they lack **categorical control**. An unconditional VAE samples digits arbitrarily—a user cannot request a specific digit (e.g., "synthesize five handwritten 7s").

**DigitForge resolves this challenge** by conditioning both the probabilistic inference network (encoder) and the generative reconstruction network (decoder) on class labels. This enables targeted, controlled synthesis of any chosen digit class without requiring post-hoc classification or discarding unwanted samples.

---

## 3. Objectives

1. **Understand & Implement Generative AI Foundations:** Formulate variational Bayesian inference and deep generative modeling.
2. **Build CVAE from Scratch:** Implement encoder, reparameterization trick, and decoder architectures in PyTorch without high-level wrapper libraries.
3. **Train on Benchmark Dataset:** Train the model on the full 60,000-image MNIST training set and validate generalization on 10,000 test images.
4. **Targeted Synthetic Synthesis:** Enable conditional generation of digits 0 through 9 with distinct stylistic variations.
5. **Continuous Latent Exploration:** Provide interactive controls to visualize how latent vectors modulate handwriting attributes.
6. **Deploy Interactive Dashboard:** Deliver a modern Streamlit application providing real-time synthesis, loss visualization, and PNG exports.
7. **Rigorous Verification:** Validate code correctness, mathematical consistency, and execution stability using automated test suites.

---

## 4. Proposed Solution

DigitForge employs a **Conditional Variational Autoencoder (CVAE)**:
- **Conditioning Mechanism:** Digit labels $y \in \{0, \dots, 9\}$ are converted into 10-dimensional one-hot vectors and concatenated with:
  1. Flattened input images ($784$ pixels) at the encoder input ($784 + 10 = 794$ dimensions).
  2. Latent vectors ($16$ dimensions) at the decoder input ($16 + 10 = 26$ dimensions).
- **Probabilistic Bottleneck:** The encoder predicts the parameters of the variational posterior distribution: mean vector $\boldsymbol{\mu}$ and log-variance $\log(\boldsymbol{\sigma}^2)$.
- **Reparameterization Trick:** Differentiable sampling via auxiliary standard Gaussian noise enables end-to-end backpropagation.
- **Joint Optimization:** The model balances pixel-level reconstruction fidelity (Binary Cross Entropy) with latent space regularity (Kullback-Leibler divergence).

---

## 5. Generative AI Concepts

Generative AI focuses on modeling the true underlying data distribution $p(\mathbf{x})$ (or conditional distribution $p(\mathbf{x}|\mathbf{y})$) so that new, previously unseen samples can be generated.

### Discriminative vs. Generative Models
- **Discriminative Models:** Learn the conditional probability $p(\mathbf{y}|\mathbf{x})$ to predict a label given an image (e.g., a classifier).
- **Generative Models:** Learn the joint probability $p(\mathbf{x}, \mathbf{y})$ or likelihood $p(\mathbf{x}|\mathbf{y})$ to synthesize realistic data instances given a class.

### Variational Inference
Computing the true posterior $p(\mathbf{z}|\mathbf{x}, \mathbf{y}) = \frac{p(\mathbf{x}, \mathbf{z}|\mathbf{y})}{p(\mathbf{x}|\mathbf{y})}$ is intractable because the marginal likelihood (evidence) $p(\mathbf{x}|\mathbf{y}) = \int p(\mathbf{x}|\mathbf{z}, \mathbf{y}) p(\mathbf{z}) d\mathbf{z}$ requires integrating over the entire continuous latent space. Variational Autoencoders resolve this by introducing a tractable variational approximation $q_\phi(\mathbf{z}|\mathbf{x}, \mathbf{y})$ and maximizing the Evidence Lower Bound (ELBO).

---

## 6. CVAE Architecture

```
                          ┌────────────────────────┐
                          │   Input Image x (784)  │
                          └───────────┬────────────┘
                                      │
       ┌────────────────────────┐     │  Concatenate
       │ One-Hot Label y (10)   ├─────┴──────────┐
       └───────────┬────────────┘                │
                   │                             ▼
                   │                  ┌─────────────────────┐
                   │                  │    Encoder (MLP)    │ (794 -> 512 -> 256)
                   │                  └──────────┬──────────┘
                   │                             │
                   │               ┌─────────────┴─────────────┐
                   │               ▼                           ▼
                   │      Mean Vector μ (16)          Log-Var log(σ²) (16)
                   │               │                           │
                   │               └─────────────┬─────────────┘
                   │                             │
                   │                             ▼
                   │               ┌───────────────────────────┐
                   │               │  Reparameterization Trick │
                   │               │     z = μ + σ ⊙ ε         │ (ε ~ N(0, I))
                   │               └─────────────┬─────────────┘
                   │                             │
                   │  Concatenate                ▼
                   └──────────────►  ┌─────────────────────────┐
                                     │   Decoder Input (26)    │ (z: 16 + y: 10)
                                     └───────────┬─────────────┘
                                                 │
                                                 ▼
                                     ┌─────────────────────────┐
                                     │      Decoder (MLP)      │ (26 -> 256 -> 512 -> 784)
                                     └───────────┬─────────────┘
                                                 │
                                                 ▼
                                     ┌─────────────────────────┐
                                     │   Sigmoid Activation    │
                                     └───────────┬─────────────┘
                                                 │
                                                 ▼
                                     ┌─────────────────────────┐
                                     │ Reconstructed / Sampled │
                                     │  Digit Image (28 × 28)  │
                                     └─────────────────────────┘
```

---

## 7. Encoder and Decoder Explanation

### Encoder (Inference Network $q_\phi(\mathbf{z}|\mathbf{x}, \mathbf{y})$)
- **Input:** Concatenation of flattened image $\mathbf{x} \in [0, 1]^{784}$ and one-hot label $\mathbf{y} \in \{0, 1\}^{10}$. Total input dimension: $794$.
- **Hidden Layers:**
  - `Linear(794 -> 512)` + `LeakyReLU(0.2)`
  - `Linear(512 -> 256)` + `LeakyReLU(0.2)`
- **Output Heads:**
  - Linear projection to mean: $\boldsymbol{\mu} \in \mathbb{R}^{16}$.
  - Linear projection to log-variance: $\log(\boldsymbol{\sigma}^2) \in \mathbb{R}^{16}$.

### Reparameterization Trick
Direct stochastic sampling $\mathbf{z} \sim \mathcal{N}(\boldsymbol{\mu}, \boldsymbol{\sigma}^2)$ has non-differentiable stochastic nodes that prevent backpropagation. The reparameterization trick isolates the stochasticity into an external parameter-free random variable $\boldsymbol{\epsilon} \sim \mathcal{N}(\mathbf{0}, \mathbf{I})$:
$$\mathbf{z} = \boldsymbol{\mu} + \boldsymbol{\sigma} \odot \boldsymbol{\epsilon} = \boldsymbol{\mu} + \exp\left(0.5 \cdot \log \boldsymbol{\sigma}^2\right) \odot \boldsymbol{\epsilon}$$
This allows gradients $\frac{\partial \mathcal{L}}{\partial \boldsymbol{\mu}}$ and $\frac{\partial \mathcal{L}}{\partial \boldsymbol{\sigma}}$ to flow through the encoder weights $\phi$ via standard backpropagation.

### Decoder (Generative Network $p_\theta(\mathbf{x}|\mathbf{z}, \mathbf{y})$)
- **Input:** Concatenation of latent vector $\mathbf{z} \in \mathbb{R}^{16}$ and one-hot label $\mathbf{y} \in \{0, 1\}^{10}$. Total input dimension: $26$.
- **Hidden Layers:**
  - `Linear(26 -> 256)` + `LeakyReLU(0.2)`
  - `Linear(256 -> 512)` + `LeakyReLU(0.2)`
- **Output Layer:**
  - `Linear(512 -> 784)` followed by `Sigmoid()` activation to constrain reconstructed pixel intensities strictly in $[0.0, 1.0]$.
  - Reshaped to single-channel 2D image: `[batch_size, 1, 28, 28]`.

---

## 8. Mathematical Formulas

### Conditional Evidence Lower Bound (ELBO)
$$\log p_\theta(\mathbf{x}|\mathbf{y}) \ge \mathbb{E}_{q_\phi(\mathbf{z}|\mathbf{x}, \mathbf{y})}\left[\log p_\theta(\mathbf{x}|\mathbf{z}, \mathbf{y})\right] - D_{\text{KL}}\left(q_\phi(\mathbf{z}|\mathbf{x}, \mathbf{y}) \parallel p(\mathbf{z})\right)$$

The training objective minimizes the negative ELBO:
$$\mathcal{L}_{\text{CVAE}} = \mathcal{L}_{\text{Recon}} + \beta \cdot \mathcal{L}_{\text{KL}}$$

### 1. Reconstruction Loss (Binary Cross Entropy)
Summed across all 784 pixels per sample and averaged across the mini-batch:
$$\mathcal{L}_{\text{Recon}} = -\frac{1}{B} \sum_{b=1}^{B} \sum_{i=1}^{784} \left[ x_{b,i} \log \hat{x}_{b,i} + (1 - x_{b,i}) \log(1 - \hat{x}_{b,i}) \right]$$

### 2. Kullback-Leibler Divergence
Closed-form analytical solution between multivariate diagonal Gaussian $q_\phi(\mathbf{z}|\mathbf{x}, \mathbf{y}) = \mathcal{N}(\boldsymbol{\mu}, \operatorname{diag}(\boldsymbol{\sigma}^2))$ and standard Gaussian prior $p(\mathbf{z}) = \mathcal{N}(\mathbf{0}, \mathbf{I})$:
$$\mathcal{L}_{\text{KL}} = -\frac{1}{2B} \sum_{b=1}^{B} \sum_{j=1}^{d_z} \left[ 1 + \log(\sigma_{b,j}^2) - \mu_{b,j}^2 - \sigma_{b,j}^2 \right]$$

---

## 9. MNIST Dataset Description

The MNIST (Modified National Institute of Standards and Technology) database is the benchmark dataset in handwritten character recognition.

- **Total Samples:** 70,000 grayscale images.
- **Training Set:** 60,000 images (`torchvision.datasets.MNIST(..., train=True)`).
- **Test Set:** 10,000 images (`torchvision.datasets.MNIST(..., train=False)`).
- **Image Dimensions:** $28 \times 28$ pixels (784 total features).
- **Class Labels:** 10 balanced digit classes: $\{0, 1, 2, 3, 4, 5, 6, 7, 8, 9\}$.
- **Preprocessing:** Transformed using `transforms.ToTensor()`, scaling 8-bit integer pixel values $[0, 255]$ into floating-point tensors in $[0.0, 1.0]$.

---

## 10. Technology Stack

| Component | Technology | Version | Purpose |
|---|---|---|---|
| **Language** | Python | 3.14 / 3.x | Core programming language |
| **Deep Learning** | PyTorch | 2.15.0 | Tensor computations, autograd, CVAE neural network |
| **Hardware Acceleration** | Apple MPS / CUDA | Native | Metal Performance Shaders / GPU acceleration |
| **Vision Utilities** | Torchvision | 0.29.2 | MNIST download & tensor transforms |
| **Frontend UI** | Streamlit | 1.67.0 | Modern interactive web dashboard |
| **Numerics** | NumPy | 2.5.4 | Array manipulations and coordinate grids |
| **Plotting** | Matplotlib | 3.11.2 | Training loss curves and composite image grids |
| **Image Processing** | Pillow (PIL) | 13.0.0 | PNG image serialization and conversion |

---

## 11. Project Folder Structure

```
DigitForge/
│
├── app.py                      # Multi-page interactive Streamlit web dashboard
├── train.py                    # CVAE model training pipeline on MNIST
├── generate.py                 # Standalone/reusable digit generation module
├── test_digitforge.py          # Automated comprehensive test suite (10 test cases)
│
├── models/
│   ├── __init__.py             # Models package exports
│   └── cvae.py                 # PyTorch CVAE class, loss functions, reparameterization
│
├── utils/
│   ├── __init__.py             # Utilities package exports
│   ├── dataset.py              # MNIST DataLoader creation & normalization
│   ├── helpers.py              # Device detection, checkpoint load/save, history JSON
│   └── visualization.py        # Tensor-to-PIL conversion, grid plotting, loss plots
│
├── dataset/                    # MNIST dataset storage (downloaded automatically)
│   └── MNIST/raw/
│
├── saved_model/
│   ├── .gitkeep
│   └── cvae_mnist.pth          # Best trained CVAE checkpoint (weights & config)
│
├── outputs/
│   ├── .gitkeep
│   ├── all_digits_matrix.png   # 10x10 verification matrix of all digits 0-9
│   ├── training_loss_curves.png# Multi-panel convergence plot
│   └── digit_X/                # Exported individual and grid PNG samples
│
├── training_history/
│   └── loss_history.json       # Epoch-by-epoch loss metrics for plotting
│
├── requirements.txt            # Python dependencies with version constraints
├── test-results.md             # Formal testing checklist and verification results
├── README.md                   # Complete academic project documentation
└── .gitignore                  # Git exclusion rules
```

---

## 12. Installation Steps

### Prerequisites
- macOS (Apple Silicon or Intel), Linux, or Windows.
- Python 3.9 through 3.14 installed.

### Step 1: Clone or Navigate to Project Directory
```bash
cd "DigitForge"
```

### Step 2: Create a Virtual Environment
```bash
python3 -m venv .venv
```

### Step 3: Activate the Virtual Environment
- **macOS / Linux:**
  ```bash
  source .venv/bin/activate
  ```
- **Windows:**
  ```cmd
  .venv\Scripts\activate
  ```

### Step 4: Install Required Dependencies
```bash
pip install -r requirements.txt
```

---

## 13. Model Training Instructions

To train the CVAE model from scratch on MNIST, run:
```bash
python train.py
```

### Configurable Hyperparameters:
```bash
python train.py --epochs 30 --batch-size 128 --lr 0.001 --latent-dim 16 --device auto
```

### Training Features:
- Automatically detects Apple Silicon **MPS**, NVIDIA **CUDA**, or **CPU**.
- Automatically downloads MNIST if not present locally.
- Logs epoch-wise progress with Total Loss, BCE Reconstruction, and KL Divergence.
- Saves the best model checkpoint based on validation loss to `saved_model/cvae_mnist.pth`.
- Saves historical loss values to `training_history/loss_history.json`.

---

## 14. Application Execution Instructions

Launch the Streamlit academic dashboard:
```bash
streamlit run app.py
```

Once launched, open your web browser to:
```
http://localhost:8501
```

---

## 15. Feature Descriptions (Generative AI Studio)

### Page 1: Overview
- **Product Landing & Hero:** Clean typography, minimalist branding, and hero headline introducing Conditional VAE synthesis.
- **Live Synthetic Sample Strip:** Displays 10 pristine synthetic digits (classes 0 through 9) generated directly by the trained CVAE.
- **Architectural Pillars:** Minimalist cards explaining Class Conditioning, Continuous Latent Manifold, and the Reparameterization Trick.
- **Technology Stack:** Clean pill badges highlighting framework versions.
- **Call-to-Action:** Direct one-click navigation to the generator.

### Page 2: Generate (Main Focus)
- **Target Digit Selector:** Choose any digit from 0 to 9.
- **Sample Count:** Generate 5, 10, or 20 unique variations simultaneously.
- **Dynamic Sampling:** Each generation call samples fresh Gaussian noise $z \sim \mathcal{N}(\mathbf{0}, \mathbf{I})$, ensuring distinct stroke variations.
- **Image Canvas:** Rendered on a clean white/light-gray display frame with consistent spacing and border polish.
- **Generate Again:** Instant re-sampling without page reloads.
- **Export Options:** Download individual digit samples as PNG or download the complete composite grid image.

### Page 3: Latent Explorer
- Explore the 16-dimensional continuous latent space $\mathbf{z} \in \mathbb{R}^{16}$.
- Interactive sliders for latent coordinates $z_0$ to $z_{15} \in [-3.0, +3.0]$.
- **Randomize Vector** and **Reset to Mean (0.0)** buttons.
- Real-time image synthesis preview demonstrating how coordinates modulate stroke thickness, slant, and curvature while class conditioning preserves digit identity.
- Instant PNG download of custom decoded samples.

### Page 4: Model Insights
- Educational breakdown: What is Generative AI? What is CVAE? Encoder, Latent Space, Decoder, Reparameterization Trick, BCE Reconstruction Loss, and KL Divergence.
- Multi-panel Matplotlib charts generated directly from actual training history (`training_history/loss_history.json`).

### Page 5: About
- Formal academic documentation including problem formulation, methodology, applications of Generative AI, dataset specifications, and future scope.

---

## 16. Testing and Verification

DigitForge includes an automated 10-point test suite in `test_digitforge.py`.

Run the automated verification suite:
```bash
python test_digitforge.py
```

### Verification Checklist:
- **Environment & Device:** Confirmed Apple Silicon MPS acceleration.
- **One-Hot Encoding:** Verified accurate conversion of scalar labels to 10-dim vectors.
- **Forward Pass & Shapes:** Confirmed output dimensions `[batch_size, 1, 28, 28]` with pixel intensities bounded in $[0.0, 1.0]$.
- **Reparameterization Trick:** Confirmed stochastic output variation and valid gradient computation.
- **Loss Calculation:** Verified mathematical validity and finiteness of BCE and KL divergence.
- **Backpropagation:** Confirmed weight updates after optimizer steps.
- **Checkpoint Persistence:** Verified saving and reloading model weights without loss of fidelity.
- **Dataset Loading:** Confirmed 60,000 training and 10,000 test images with valid pixel normalization.
- **Digit Generation (0-9):** Tested generation across all 10 digit classes and verified rejection of invalid inputs.
- **Image Export:** Verified PIL image conversion and PNG file serialization.

*(See [test-results.md](test-results.md) for full execution logs and tabular results).*

---

## 17. Screenshots & Generated Outputs

All outputs are generated directly by the trained CVAE model and stored in `outputs/`:

1. **All Digits 0–9 Matrix:**  
   `outputs/all_digits_matrix.png`  
   *(10 distinct synthetic variations synthesized for each digit class 0 through 9).*

2. **Sample Grid for Digit 7:**  
   `outputs/digit_7_grid_10samples.png`  
   *(10 unique samples of digit 7 showing varied slants and strokes).*

3. **Empirical Loss Progression:**  
   `outputs/training_loss_curves.png`  
   *(3-panel plot of Total Loss, BCE Reconstruction, and KL Divergence across 30 epochs).*

---

## 18. Limitations

1. **Resolution:** Fixed to $28 \times 28$ grayscale pixels to align with the standard MNIST benchmark.
2. **MLP Architecture:** Fully connected layers treat pixels independently and lack 2D translational invariance compared to convolutional layers.
3. **Latent Entanglement:** Standard VAEs do not enforce explicit semantic disentanglement; individual latent dimensions may affect multiple visual attributes simultaneously.

---

## 19. Future Enhancements

1. **Convolutional CVAE (Conv-CVAE):** Implement 2D transposed convolution layers for sharper stroke boundaries.
2. **$\beta$-VAE Formulation:** Adjust the $\beta$ hyperparameter to encourage disentangled latent representations.
3. **Diffusion Models (DDPM):** Extend conditional generation to Denoising Diffusion Probabilistic Models.
4. **Higher Resolution Datasets:** Adapt the architecture for RGB character datasets such as Omniglot, SVHN, or EMNIST.

---

## 20. Conclusion

**DigitForge** provides a complete, mathematically sound, and rigorously verified implementation of a Conditional Variational Autoencoder for handwritten digit generation. By combining formal generative deep learning principles with an accessible Streamlit interface, the project serves as an ideal final-year academic mini-project demonstrating probabilistic modeling, class-conditioned synthesis, and continuous latent space navigation.
