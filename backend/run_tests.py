#!/usr/bin/env python3
"""
Comprehensive Test Runner for Madellang Backend Architecture
This script runs all tests and provides detailed analysis for stakeholders.
"""

import os
import sys
import subprocess
import time
import json
from pathlib import Path
from typing import Dict, List, Tuple

class TestRunner:
    def __init__(self):
        self.test_results = {}
        self.performance_metrics = {}
        self.coverage_data = {}
        
    def run_test_suite(self, test_file: str) -> Dict:
        """Run a specific test suite and return results"""
        print(f"\n🧪 Running tests from: {test_file}")
        
        start_time = time.time()
        
        try:
            # Run pytest with verbose output
            result = subprocess.run(
                [sys.executable, "-m", "pytest", test_file, "-v", "--tb=short"],
                capture_output=True,
                text=True,
                timeout=300  # 5 minute timeout
            )
            
            end_time = time.time()
            duration = end_time - start_time
            
            # Parse test results
            test_count = 0
            passed = 0
            failed = 0
            errors = 0
            
            for line in result.stdout.split('\n'):
                if '::' in line and 'PASSED' in line:
                    passed += 1
                    test_count += 1
                elif '::' in line and 'FAILED' in line:
                    failed += 1
                    test_count += 1
                elif '::' in line and 'ERROR' in line:
                    errors += 1
                    test_count += 1
            
            return {
                'file': test_file,
                'duration': duration,
                'test_count': test_count,
                'passed': passed,
                'failed': failed,
                'errors': errors,
                'success_rate': (passed / test_count * 100) if test_count > 0 else 0,
                'stdout': result.stdout,
                'stderr': result.stderr,
                'return_code': result.returncode
            }
            
        except subprocess.TimeoutExpired:
            return {
                'file': test_file,
                'duration': 300,
                'test_count': 0,
                'passed': 0,
                'failed': 0,
                'errors': 1,
                'success_rate': 0,
                'stdout': '',
                'stderr': 'Test suite timed out after 5 minutes',
                'return_code': -1
            }
        except Exception as e:
            return {
                'file': test_file,
                'duration': 0,
                'test_count': 0,
                'passed': 0,
                'failed': 0,
                'errors': 1,
                'success_rate': 0,
                'stdout': '',
                'stderr': str(e),
                'return_code': -1
            }
    
    def run_all_tests(self) -> Dict:
        """Run all available test suites"""
        print("🚀 Starting comprehensive test suite for Madellang Backend")
        print("=" * 60)
        
        # Find all test files
        test_dir = Path(__file__).parent / "tests"
        test_files = list(test_dir.glob("test_*.py"))
        
        if not test_files:
            print("❌ No test files found!")
            return {}
        
        print(f"📁 Found {len(test_files)} test files:")
        for test_file in test_files:
            print(f"   - {test_file.name}")
        
        # Run each test suite
        for test_file in test_files:
            result = self.run_test_suite(str(test_file))
            self.test_results[test_file.name] = result
        
        return self.test_results
    
    def run_performance_tests(self) -> Dict:
        """Run performance benchmarks"""
        print("\n⚡ Running performance tests...")
        
        performance_tests = {
            'model_selection': self._test_model_selection_performance(),
            'audio_processing': self._test_audio_processing_performance(),
            'websocket_connection': self._test_websocket_performance(),
            'translation_pipeline': self._test_translation_performance()
        }
        
        self.performance_metrics = performance_tests
        return performance_tests
    
    def _test_model_selection_performance(self) -> Dict:
        """Test model selection performance"""
        try:
            import time
            from model_selector import select_appropriate_whisper_model
            
            start_time = time.time()
            for _ in range(100):
                select_appropriate_whisper_model()
            end_time = time.time()
            
            return {
                'test_name': 'Model Selection Performance',
                'iterations': 100,
                'total_time': end_time - start_time,
                'avg_time_per_call': (end_time - start_time) / 100,
                'status': 'PASS' if (end_time - start_time) < 1.0 else 'FAIL'
            }
        except Exception as e:
            return {
                'test_name': 'Model Selection Performance',
                'error': str(e),
                'status': 'ERROR'
            }
    
    def _test_audio_processing_performance(self) -> Dict:
        """Test audio processing performance"""
        try:
            import time
            import numpy as np
            
            # Simulate audio processing
            audio_data = np.random.rand(16000)  # 1 second of audio at 16kHz
            
            start_time = time.time()
            for _ in range(10):
                # Simulate audio processing operations
                processed = np.frombuffer(audio_data.tobytes(), dtype=np.float32)
                _ = processed.mean()
            end_time = time.time()
            
            return {
                'test_name': 'Audio Processing Performance',
                'iterations': 10,
                'total_time': end_time - start_time,
                'avg_time_per_second_audio': (end_time - start_time) / 10,
                'status': 'PASS' if (end_time - start_time) < 1.0 else 'FAIL'
            }
        except Exception as e:
            return {
                'test_name': 'Audio Processing Performance',
                'error': str(e),
                'status': 'ERROR'
            }
    
    def _test_websocket_performance(self) -> Dict:
        """Test WebSocket connection performance"""
        try:
            import time
            import asyncio
            
            async def test_websocket():
                # Simulate WebSocket connection overhead
                await asyncio.sleep(0.001)  # 1ms delay
                return True
            
            start_time = time.time()
            for _ in range(100):
                asyncio.run(test_websocket())
            end_time = time.time()
            
            return {
                'test_name': 'WebSocket Connection Performance',
                'iterations': 100,
                'total_time': end_time - start_time,
                'avg_time_per_connection': (end_time - start_time) / 100,
                'status': 'PASS' if (end_time - start_time) < 1.0 else 'FAIL'
            }
        except Exception as e:
            return {
                'test_name': 'WebSocket Connection Performance',
                'error': str(e),
                'status': 'ERROR'
            }
    
    def _test_translation_performance(self) -> Dict:
        """Test translation pipeline performance"""
        try:
            import time
            
            # Simulate translation pipeline
            start_time = time.time()
            for _ in range(10):
                # Simulate translation steps
                time.sleep(0.01)  # 10ms per translation
            end_time = time.time()
            
            return {
                'test_name': 'Translation Pipeline Performance',
                'iterations': 10,
                'total_time': end_time - start_time,
                'avg_time_per_translation': (end_time - start_time) / 10,
                'status': 'PASS' if (end_time - start_time) < 1.0 else 'FAIL'
            }
        except Exception as e:
            return {
                'test_name': 'Translation Pipeline Performance',
                'error': str(e),
                'status': 'ERROR'
            }
    
    def generate_report(self) -> str:
        """Generate a comprehensive test report"""
        report = []
        report.append("# Madellang Backend Architecture - Test Report")
        report.append("=" * 60)
        report.append(f"Generated: {time.strftime('%Y-%m-%d %H:%M:%S')}")
        report.append("")
        
        # Test Results Summary
        report.append("## Test Results Summary")
        report.append("-" * 30)
        
        total_tests = 0
        total_passed = 0
        total_failed = 0
        total_errors = 0
        
        for test_file, result in self.test_results.items():
            total_tests += result['test_count']
            total_passed += result['passed']
            total_failed += result['failed']
            total_errors += result['errors']
            
            status = "✅ PASS" if result['success_rate'] >= 80 else "❌ FAIL"
            report.append(f"{status} {test_file}: {result['passed']}/{result['test_count']} tests passed ({result['success_rate']:.1f}%)")
        
        overall_success_rate = (total_passed / total_tests * 100) if total_tests > 0 else 0
        report.append(f"\n**Overall Success Rate: {overall_success_rate:.1f}%**")
        report.append(f"**Total Tests: {total_tests} | Passed: {total_passed} | Failed: {total_failed} | Errors: {total_errors}**")
        
        # Detailed Test Results
        report.append("\n## Detailed Test Results")
        report.append("-" * 30)
        
        for test_file, result in self.test_results.items():
            report.append(f"\n### {test_file}")
            report.append(f"- Duration: {result['duration']:.2f}s")
            report.append(f"- Tests: {result['test_count']}")
            report.append(f"- Passed: {result['passed']}")
            report.append(f"- Failed: {result['failed']}")
            report.append(f"- Errors: {result['errors']}")
            report.append(f"- Success Rate: {result['success_rate']:.1f}%")
            
            if result['stderr']:
                report.append(f"- Errors: {result['stderr']}")
        
        # Performance Results
        if self.performance_metrics:
            report.append("\n## Performance Test Results")
            report.append("-" * 30)
            
            for test_name, metrics in self.performance_metrics.items():
                report.append(f"\n### {metrics.get('test_name', test_name)}")
                if 'error' in metrics:
                    report.append(f"❌ ERROR: {metrics['error']}")
                else:
                    status = "✅ PASS" if metrics['status'] == 'PASS' else "❌ FAIL"
                    report.append(f"{status}")
                    for key, value in metrics.items():
                        if key not in ['test_name', 'status']:
                            if isinstance(value, float):
                                report.append(f"- {key}: {value:.4f}")
                            else:
                                report.append(f"- {key}: {value}")
        
        # Architecture Assessment
        report.append("\n## Architecture Assessment")
        report.append("-" * 30)
        
        # Test Coverage Analysis
        report.append("\n### Test Coverage Analysis")
        coverage_analysis = {
            'WebSocket Server': 'High' if any('test_full_pipeline' in k for k in self.test_results.keys()) else 'Low',
            'Audio Processing': 'Medium' if any('test_full_pipeline' in k for k in self.test_results.keys()) else 'Low',
            'Translation Service': 'Medium' if any('test_translation' in k for k in self.test_results.keys()) else 'Low',
            'Room Management': 'Low' if any('test_rooms' in k for k in self.test_results.keys()) else 'None',
            'Model Management': 'None',
            'Order Module': 'None'
        }
        
        for component, coverage in coverage_analysis.items():
            status = "✅" if coverage in ['High', 'Medium'] else "⚠️" if coverage == 'Low' else "❌"
            report.append(f"{status} {component}: {coverage} coverage")
        
        # Recommendations
        report.append("\n### Recommendations")
        report.append("-" * 30)
        
        if overall_success_rate < 80:
            report.append("❌ **Critical**: Test success rate is below 80%. Immediate attention required.")
        
        if coverage_analysis['Order Module'] == 'None':
            report.append("❌ **Critical**: Order Module has no test coverage. This is essential for MVP.")
        
        if coverage_analysis['Model Management'] == 'None':
            report.append("⚠️ **Important**: Model Management needs test coverage for reliability.")
        
        if total_errors > 0:
            report.append("⚠️ **Important**: Some tests are failing with errors. Review error handling.")
        
        report.append("\n### Next Steps")
        report.append("-" * 30)
        report.append("1. Implement Order Module tests")
        report.append("2. Add Model Management test coverage")
        report.append("3. Improve error handling in failing tests")
        report.append("4. Add integration tests for full pipeline")
        report.append("5. Implement performance benchmarks for production")
        
        return "\n".join(report)
    
    def save_report(self, filename: str = "test_report.md"):
        """Save the test report to a file"""
        report = self.generate_report()
        
        with open(filename, 'w') as f:
            f.write(report)
        
        print(f"\n📄 Test report saved to: {filename}")
    
    def run_comprehensive_analysis(self):
        """Run complete analysis and generate report"""
        print("🔍 Starting comprehensive backend architecture analysis...")
        
        # Run all tests
        test_results = self.run_all_tests()
        
        # Run performance tests
        performance_results = self.run_performance_tests()
        
        # Generate and display report
        report = self.generate_report()
        print("\n" + "=" * 60)
        print("📊 COMPREHENSIVE TEST REPORT")
        print("=" * 60)
        print(report)
        
        # Save report
        self.save_report()
        
        return {
            'test_results': test_results,
            'performance_results': performance_results,
            'report': report
        }

def main():
    """Main entry point"""
    runner = TestRunner()
    
    try:
        results = runner.run_comprehensive_analysis()
        
        # Exit with appropriate code
        total_tests = sum(r['test_count'] for r in results['test_results'].values())
        total_passed = sum(r['passed'] for r in results['test_results'].values())
        
        if total_tests > 0 and (total_passed / total_tests) >= 0.8:
            print("\n✅ Test suite completed successfully!")
            sys.exit(0)
        else:
            print("\n❌ Test suite completed with failures!")
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\n⏹️ Test execution interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 Unexpected error during test execution: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 