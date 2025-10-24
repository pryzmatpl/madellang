#!/bin/bash
# Test runner for nanochat training integration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration
TEST_DIR="/app/tests"
PYTEST_CMD="python -m pytest"

# Function to check if we're in a container
is_container() {
    [ -f /.dockerenv ] || [ -n "${DOCKER_CONTAINER:-}" ]
}

# Function to check if service is running
check_service() {
    if curl -s -f "http://localhost:8000/health" > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Function to start service if needed
start_service() {
    if ! check_service; then
        print_status "Service not running, starting it..."
        
        if is_container; then
            print_status "Running in container, starting service in background..."
            uvicorn main:app --host 0.0.0.0 --port 8000 &
            SERVICE_PID=$!
            
            # Wait for service to start
            local max_attempts=30
            local attempt=1
            
            while [ $attempt -le $max_attempts ]; do
                if check_service; then
                    print_success "Service started successfully"
                    return 0
                fi
                
                print_status "Waiting for service to start... ($attempt/$max_attempts)"
                sleep 2
                attempt=$((attempt + 1))
            done
            
            print_error "Service failed to start"
            return 1
        else
            print_error "Not in container, please start the service manually"
            print_status "Run: docker-compose up -d backend"
            return 1
        fi
    else
        print_success "Service is already running"
        return 0
    fi
}

# Function to stop service
stop_service() {
    if [ -n "$SERVICE_PID" ]; then
        print_status "Stopping service..."
        kill $SERVICE_PID 2>/dev/null || true
        print_success "Service stopped"
    fi
}

# Function to run unit tests
run_unit_tests() {
    print_status "Running unit tests..."
    
    if $PYTEST_CMD tests/unit/ -m "unit" --tb=short; then
        print_success "Unit tests passed"
        return 0
    else
        print_error "Unit tests failed"
        return 1
    fi
}

# Function to run integration tests
run_integration_tests() {
    print_status "Running integration tests..."
    
    if $PYTEST_CMD tests/integration/ -m "integration" --tb=short; then
        print_success "Integration tests passed"
        return 0
    else
        print_error "Integration tests failed"
        return 1
    fi
}

# Function to run functional tests
run_functional_tests() {
    print_status "Running functional tests..."
    
    if bash tests/functional/test_training_functionality.sh; then
        print_success "Functional tests passed"
        return 0
    else
        print_error "Functional tests failed"
        return 1
    fi
}

# Function to run all tests
run_all_tests() {
    print_status "Running all tests..."
    
    local unit_passed=0
    local integration_passed=0
    local functional_passed=0
    
    # Run unit tests
    if run_unit_tests; then
        unit_passed=1
    fi
    
    echo ""
    
    # Run integration tests
    if run_integration_tests; then
        integration_passed=1
    fi
    
    echo ""
    
    # Run functional tests
    if run_functional_tests; then
        functional_passed=1
    fi
    
    echo ""
    
    # Summary
    print_status "Test Summary:"
    if [ $unit_passed -eq 1 ]; then
        print_success "Unit tests: PASSED"
    else
        print_error "Unit tests: FAILED"
    fi
    
    if [ $integration_passed -eq 1 ]; then
        print_success "Integration tests: PASSED"
    else
        print_error "Integration tests: FAILED"
    fi
    
    if [ $functional_passed -eq 1 ]; then
        print_success "Functional tests: PASSED"
    else
        print_error "Functional tests: FAILED"
    fi
    
    if [ $unit_passed -eq 1 ] && [ $integration_passed -eq 1 ] && [ $functional_passed -eq 1 ]; then
        print_success "All tests passed!"
        return 0
    else
        print_error "Some tests failed!"
        return 1
    fi
}

# Function to run specific test
run_specific_test() {
    local test_name="$1"
    
    case "$test_name" in
        "unit")
            run_unit_tests
            ;;
        "integration")
            run_integration_tests
            ;;
        "functional")
            run_functional_tests
            ;;
        *)
            print_error "Unknown test type: $test_name"
            print_status "Available test types: unit, integration, functional"
            return 1
            ;;
    esac
}

# Function to show help
show_help() {
    echo "Nanochat Training Test Runner"
    echo ""
    echo "Usage: $0 [OPTIONS] [TEST_TYPE]"
    echo ""
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo "  -s, --start    Start service before running tests"
    echo "  -k, --keep     Keep service running after tests"
    echo ""
    echo "Test Types:"
    echo "  unit           Run unit tests only"
    echo "  integration    Run integration tests only"
    echo "  functional     Run functional tests only"
    echo "  all            Run all tests (default)"
    echo ""
    echo "Examples:"
    echo "  $0                    # Run all tests"
    echo "  $0 unit              # Run unit tests only"
    echo "  $0 --start all       # Start service and run all tests"
    echo "  $0 -s -k functional  # Start service, run functional tests, keep service running"
}

# Main function
main() {
    local start_service_flag=0
    local keep_service_flag=0
    local test_type="all"
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -s|--start)
                start_service_flag=1
                shift
                ;;
            -k|--keep)
                keep_service_flag=1
                shift
                ;;
            unit|integration|functional|all)
                test_type="$1"
                shift
                ;;
            *)
                print_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # Change to test directory
    cd "$TEST_DIR/.."
    
    # Start service if requested
    if [ $start_service_flag -eq 1 ]; then
        if ! start_service; then
            print_error "Failed to start service"
            exit 1
        fi
    fi
    
    # Run tests
    local test_result=0
    
    case "$test_type" in
        "all")
            run_all_tests
            test_result=$?
            ;;
        *)
            run_specific_test "$test_type"
            test_result=$?
            ;;
    esac
    
    # Stop service if we started it and don't want to keep it
    if [ $start_service_flag -eq 1 ] && [ $keep_service_flag -eq 0 ]; then
        stop_service
    fi
    
    exit $test_result
}

# Trap to ensure service is stopped on exit
trap 'if [ -n "$SERVICE_PID" ]; then kill $SERVICE_PID 2>/dev/null || true; fi' EXIT

# Run main function
main "$@"
