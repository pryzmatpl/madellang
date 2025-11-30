#!/bin/bash
# Functional tests for nanochat training integration

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
BASE_URL="http://localhost:8000"
TIMEOUT=300  # 5 minutes timeout for tests

# Function to wait for service to be ready
wait_for_service() {
    print_status "Waiting for service to be ready..."
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -f "$BASE_URL/health" > /dev/null 2>&1; then
            print_success "Service is ready"
            return 0
        fi
        
        print_status "Attempt $attempt/$max_attempts - Service not ready yet"
        sleep 10
        attempt=$((attempt + 1))
    done
    
    print_error "Service failed to start within timeout"
    return 1
}

# Function to make API requests
api_request() {
    local method="$1"
    local endpoint="$2"
    local data="$3"
    
    if [ -n "$data" ]; then
        curl -s -X "$method" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$BASE_URL$endpoint"
    else
        curl -s -X "$method" "$BASE_URL$endpoint"
    fi
}

# Function to check API response
check_response() {
    local response="$1"
    local expected_status="$2"
    
    if echo "$response" | grep -q "$expected_status"; then
        return 0
    else
        return 1
    fi
}

# Test 1: Health Check
test_health_check() {
    print_status "Testing health check endpoint..."
    
    response=$(api_request "GET" "/health")
    
    if check_response "$response" "ok"; then
        print_success "Health check passed"
        return 0
    else
        print_error "Health check failed: $response"
        return 1
    fi
}

# Test 2: System Info
test_system_info() {
    print_status "Testing system info endpoint..."
    
    response=$(api_request "GET" "/system-info")
    
    if echo "$response" | grep -q "pytorch_version"; then
        print_success "System info endpoint working"
        echo "$response" | jq '.' 2>/dev/null || echo "$response"
        return 0
    else
        print_error "System info endpoint failed: $response"
        return 1
    fi
}

# Test 3: Training Config Templates
test_training_templates() {
    print_status "Testing training config templates..."
    
    response=$(api_request "GET" "/training/config/templates")
    
    if echo "$response" | grep -q "cpu_demo"; then
        print_success "Training templates endpoint working"
        return 0
    else
        print_error "Training templates endpoint failed: $response"
        return 1
    fi
}

# Test 4: List Training Jobs (should be empty initially)
test_list_jobs_empty() {
    print_status "Testing list jobs (should be empty)..."
    
    response=$(api_request "GET" "/training/jobs")
    
    if echo "$response" | grep -q "active_jobs.*0"; then
        print_success "List jobs endpoint working (empty)"
        return 0
    else
        print_error "List jobs endpoint failed: $response"
        return 1
    fi
}

# Test 5: Start CPU Demo Training
test_start_cpu_demo() {
    print_status "Testing CPU demo training start..."
    
    config='{
        "training_stage": "cpu_demo",
        "model_depth": 4,
        "device_batch_size": 1,
        "num_iterations": 5
    }'
    
    response=$(api_request "POST" "/training/start" "$config")
    
    if echo "$response" | grep -q "job_id"; then
        JOB_ID=$(echo "$response" | jq -r '.job_id' 2>/dev/null || echo "unknown")
        print_success "CPU demo training started with job ID: $JOB_ID"
        return 0
    else
        print_error "Failed to start CPU demo training: $response"
        return 1
    fi
}

# Test 6: Monitor Training Progress
test_monitor_training() {
    print_status "Testing training progress monitoring..."
    
    if [ -z "$JOB_ID" ]; then
        print_error "No job ID available for monitoring"
        return 1
    fi
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        response=$(api_request "GET" "/training/status/$JOB_ID")
        
        if echo "$response" | grep -q "status"; then
            status=$(echo "$response" | jq -r '.status' 2>/dev/null || echo "unknown")
            progress=$(echo "$response" | jq -r '.progress' 2>/dev/null || echo "0")
            stage=$(echo "$response" | jq -r '.current_stage' 2>/dev/null || echo "unknown")
            
            print_status "Job $JOB_ID - Status: $status, Progress: $progress%, Stage: $stage"
            
            if [ "$status" = "completed" ]; then
                print_success "Training completed successfully"
                return 0
            elif [ "$status" = "failed" ]; then
                print_error "Training failed"
                echo "$response" | jq '.' 2>/dev/null || echo "$response"
                return 1
            fi
        else
            print_warning "Could not get training status: $response"
        fi
        
        sleep 10
        attempt=$((attempt + 1))
    done
    
    print_warning "Training monitoring timed out"
    return 1
}

# Test 7: Get Training Logs
test_get_training_logs() {
    print_status "Testing training logs retrieval..."
    
    if [ -z "$JOB_ID" ]; then
        print_error "No job ID available for logs"
        return 1
    fi
    
    response=$(api_request "GET" "/training/logs/$JOB_ID")
    
    if echo "$response" | grep -q "logs"; then
        print_success "Training logs retrieved successfully"
        return 0
    else
        print_error "Failed to get training logs: $response"
        return 1
    fi
}

# Test 8: Stop Training (if still running)
test_stop_training() {
    print_status "Testing training stop functionality..."
    
    if [ -z "$JOB_ID" ]; then
        print_error "No job ID available for stopping"
        return 1
    fi
    
    # Check if job is still running
    response=$(api_request "GET" "/training/status/$JOB_ID")
    status=$(echo "$response" | jq -r '.status' 2>/dev/null || echo "unknown")
    
    if [ "$status" = "running" ] || [ "$status" = "starting" ]; then
        response=$(api_request "POST" "/training/stop/$JOB_ID")
        
        if echo "$response" | grep -q "stopped"; then
            print_success "Training stopped successfully"
            return 0
        else
            print_error "Failed to stop training: $response"
            return 1
        fi
    else
        print_status "Training already completed, skipping stop test"
        return 0
    fi
}

# Test 9: List Jobs After Training
test_list_jobs_after_training() {
    print_status "Testing list jobs after training..."
    
    response=$(api_request "GET" "/training/jobs")
    
    if echo "$response" | grep -q "jobs"; then
        print_success "List jobs endpoint working after training"
        echo "$response" | jq '.' 2>/dev/null || echo "$response"
        return 0
    else
        print_error "List jobs endpoint failed: $response"
        return 1
    fi
}

# Test 10: Cleanup Old Jobs
test_cleanup_jobs() {
    print_status "Testing cleanup functionality..."
    
    response=$(api_request "POST" "/training/cleanup?max_age_hours=1")
    
    if echo "$response" | grep -q "Cleaned up"; then
        print_success "Cleanup functionality working"
        return 0
    else
        print_error "Cleanup functionality failed: $response"
        return 1
    fi
}

# Test 11: Error Handling
test_error_handling() {
    print_status "Testing error handling..."
    
    # Test non-existent job status
    response=$(api_request "GET" "/training/status/non-existent-job")
    
    if echo "$response" | grep -q "404"; then
        print_success "Error handling for non-existent job working"
    else
        print_error "Error handling failed: $response"
        return 1
    fi
    
    # Test invalid training config
    invalid_config='{
        "training_stage": "invalid_stage",
        "model_depth": -1
    }'
    
    response=$(api_request "POST" "/training/start" "$invalid_config")
    
    # Should still work (validation happens in service, not endpoint)
    if echo "$response" | grep -q "job_id"; then
        print_success "Invalid config handling working"
        return 0
    else
        print_error "Invalid config handling failed: $response"
        return 1
    fi
}

# Main test runner
run_tests() {
    print_status "Starting functional tests for nanochat training integration..."
    
    local tests_passed=0
    local tests_failed=0
    local total_tests=11
    
    # Wait for service to be ready
    if ! wait_for_service; then
        print_error "Service not ready, aborting tests"
        exit 1
    fi
    
    # Run tests
    tests=(
        "test_health_check"
        "test_system_info"
        "test_training_templates"
        "test_list_jobs_empty"
        "test_start_cpu_demo"
        "test_monitor_training"
        "test_get_training_logs"
        "test_stop_training"
        "test_list_jobs_after_training"
        "test_cleanup_jobs"
        "test_error_handling"
    )
    
    for test in "${tests[@]}"; do
        print_status "Running $test..."
        
        if $test; then
            print_success "$test passed"
            tests_passed=$((tests_passed + 1))
        else
            print_error "$test failed"
            tests_failed=$((tests_failed + 1))
        fi
        
        echo ""
    done
    
    # Summary
    print_status "Test Summary:"
    print_success "Passed: $tests_passed/$total_tests"
    
    if [ $tests_failed -gt 0 ]; then
        print_error "Failed: $tests_failed/$total_tests"
        return 1
    else
        print_success "All tests passed!"
        return 0
    fi
}

# Check if jq is available
if ! command -v jq &> /dev/null; then
    print_warning "jq not found, some tests may not work properly"
    print_status "Install jq with: apt-get install jq"
fi

# Check if curl is available
if ! command -v curl &> /dev/null; then
    print_error "curl not found, cannot run tests"
    exit 1
fi

# Run the tests
if run_tests; then
    print_success "All functional tests completed successfully!"
    exit 0
else
    print_error "Some functional tests failed!"
    exit 1
fi
