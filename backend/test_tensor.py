import torch

# Check if an AMD GPU is available
print("PyTorch version:", torch.__version__)
print("Available devices:", torch.cuda.device_count())
print("Is GPU available?", torch.cuda.is_available())

# Create a tensor on the GPU
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print("Using device:", device)

# Basic tensor calculation
x = torch.randn(1000, 1000, device=device)
y = torch.randn(1000, 1000, device=device)
z = x @ y  # matrix multiplication
z = y @ z

print("Result shape:", z.shape)
print("Result device:", z.device)
print("Sample result:", z[0, 0].item())
