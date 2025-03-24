# Voice Translation Project Makefile
# This Makefile provides commands for development and deployment

.PHONY: dev dev-frontend dev-backend install clean build

# Development - Run both frontend and backend
dev:
	make -j dev-frontend dev-backend

# Start frontend development server
dev-frontend:
	@echo "Starting frontend development server..."
	cd frontend && npm start

# Start backend development server with hot reload
dev-backend:
	@echo "Starting backend development server..."
	cd backend && ./run_with_custom_torch.sh

# Install dependencies
install: install-frontend install-backend

# Install frontend dependencies
install-frontend:
	@echo "Installing frontend dependencies..."
	cd frontend && npm install

# Install backend dependencies
install-backend:
	@echo "Installing backend dependencies..."
	cd backend && pip install -r requirements.txt

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	rm -rf frontend/build frontend/dist
	find . -type d -name __pycache__ -exec rm -rf {} +

# Build for production
build: build-frontend

# Build frontend for production
build-frontend:
	@echo "Building frontend for production..."
	cd frontend && npm run build

# Run tests
test: test-frontend test-backend

# Run frontend tests
test-frontend:
	@echo "Running frontend tests..."
	cd frontend && npm test

# Run backend tests
test-backend:
	@echo "Running backend tests..."
	cd backend && pytest

# Show help information
help:
	@echo "Available commands:"
	@echo "  make dev               - Start both frontend and backend for development"
	@echo "  make dev-frontend      - Start only frontend development server"
	@echo "  make dev-backend       - Start only backend development server"
	@echo "  make install           - Install all dependencies"
	@echo "  make clean             - Remove build artifacts"
	@echo "  make build             - Build for production"
	@echo "  make test              - Run all tests" 