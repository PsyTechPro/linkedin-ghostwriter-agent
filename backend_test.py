import requests
import sys
import json
from datetime import datetime

class LinkedInGhostwriterTester:
    def __init__(self, base_url="https://linkedin-ghost-2.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=30)

            success = response.status_code == expected_status
            
            if success:
                self.log_test(name, True)
                try:
                    return True, response.json() if response.content else {}
                except:
                    return True, {}
            else:
                error_msg = f"Expected {expected_status}, got {response.status_code}"
                try:
                    error_detail = response.json().get('detail', '')
                    if error_detail:
                        error_msg += f" - {error_detail}"
                except:
                    pass
                self.log_test(name, False, error_msg)
                return False, {}

        except Exception as e:
            self.log_test(name, False, f"Request failed: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test basic health endpoints"""
        print("\n=== HEALTH CHECK TESTS ===")
        self.run_test("API Root", "GET", "", 200)
        self.run_test("Health Check", "GET", "health", 200)

    def test_auth_flow(self):
        """Test authentication endpoints"""
        print("\n=== AUTHENTICATION TESTS ===")
        
        # Test user registration
        test_email = f"test_{datetime.now().strftime('%H%M%S')}@example.com"
        test_password = "TestPass123!"
        test_name = "Test User"
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data={
                "email": test_email,
                "password": test_password,
                "name": test_name
            }
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            print(f"   Token obtained: {self.token[:20]}...")
        
        # Test duplicate registration
        self.run_test(
            "Duplicate Registration (should fail)",
            "POST",
            "auth/register",
            400,
            data={
                "email": test_email,
                "password": test_password,
                "name": test_name
            }
        )
        
        # Test login
        success, login_response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data={
                "email": test_email,
                "password": test_password
            }
        )
        
        # Test invalid login
        self.run_test(
            "Invalid Login (should fail)",
            "POST",
            "auth/login",
            401,
            data={
                "email": test_email,
                "password": "wrongpassword"
            }
        )
        
        # Test get current user
        if self.token:
            self.run_test("Get Current User", "GET", "auth/me", 200)

    def test_voice_profile_flow(self):
        """Test voice profile endpoints"""
        print("\n=== VOICE PROFILE TESTS ===")
        
        if not self.token:
            print("❌ Skipping voice profile tests - no auth token")
            return
        
        # Test get voice profile (should be empty initially)
        self.run_test("Get Voice Profile (empty)", "GET", "voice-profile", 200)
        
        # Test sample profile endpoint
        self.run_test("Get Sample Profile", "GET", "demo/sample-profile", 200)
        
        # Test voice analysis
        sample_posts = """Here's what I learned after 10 years of leading teams:

The best leaders don't have all the answers.
They have the best questions.

Ask more. Tell less. Watch your team transform.

---

Stop saying "I don't have time."
Start saying "It's not a priority."

Watch how quickly your calendar reflects your values.

Time management is really priority management."""
        
        success, profile_response = self.run_test(
            "Voice Profile Analysis",
            "POST",
            "voice-profile/analyze",
            200,
            data={
                "raw_samples": sample_posts,
                "settings": {
                    "post_length": "medium",
                    "emoji": "light",
                    "hashtags": "1-3",
                    "cta": "soft",
                    "risk_filter": "balanced"
                }
            }
        )
        
        # Test get voice profile after creation
        self.run_test("Get Voice Profile (after creation)", "GET", "voice-profile", 200)
        
        # Test update guardrails
        self.run_test(
            "Update Guardrails",
            "PUT",
            "voice-profile/settings",
            200,
            data={
                "post_length": "long",
                "emoji": "normal",
                "hashtags": "1-3",
                "cta": "direct",
                "risk_filter": "spicy"
            }
        )

    def test_post_generation_flow(self):
        """Test post generation and management"""
        print("\n=== POST GENERATION TESTS ===")
        
        if not self.token:
            print("❌ Skipping post generation tests - no auth token")
            return
        
        # Test generate posts
        success, posts_response = self.run_test(
            "Generate Posts",
            "POST",
            "posts/generate",
            200,
            data={
                "topic": "Remote work productivity",
                "audience": "Software developers"
            }
        )
        
        post_id = None
        if success and posts_response and len(posts_response) > 0:
            post_id = posts_response[0]['id']
            print(f"   Generated {len(posts_response)} posts")
        
        # Test get all posts
        success, all_posts = self.run_test("Get All Posts", "GET", "posts", 200)
        
        # Test get favorite posts
        self.run_test("Get Favorite Posts", "GET", "posts?favorites_only=true", 200)
        
        if post_id:
            # Test update post (favorite)
            self.run_test(
                "Update Post (Favorite)",
                "PUT",
                f"posts/{post_id}",
                200,
                data={"is_favorite": True}
            )
            
            # Test update post content
            self.run_test(
                "Update Post Content",
                "PUT",
                f"posts/{post_id}",
                200,
                data={"content": "Updated post content for testing"}
            )
            
            # Test regenerate post
            self.run_test(
                "Regenerate Post",
                "POST",
                f"posts/{post_id}/regenerate",
                200
            )
            
            # Test delete post
            self.run_test(
                "Delete Post",
                "DELETE",
                f"posts/{post_id}",
                200
            )

    def test_error_cases(self):
        """Test error handling"""
        print("\n=== ERROR HANDLING TESTS ===")
        
        # Test unauthorized access
        old_token = self.token
        self.token = None
        
        self.run_test(
            "Unauthorized Voice Profile Access",
            "GET",
            "voice-profile",
            401
        )
        
        self.run_test(
            "Unauthorized Post Generation",
            "POST",
            "posts/generate",
            401,
            data={"topic": "test"}
        )
        
        # Restore token
        self.token = old_token
        
        # Test invalid post generation (no voice profile)
        # This would require creating a new user without voice profile
        
        # Test invalid endpoints
        self.run_test(
            "Invalid Endpoint",
            "GET",
            "nonexistent",
            404
        )

    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 Starting LinkedIn Ghostwriter API Tests")
        print(f"Base URL: {self.base_url}")
        
        try:
            self.test_health_check()
            self.test_auth_flow()
            self.test_voice_profile_flow()
            self.test_post_generation_flow()
            self.test_error_cases()
            
        except Exception as e:
            print(f"\n💥 Test suite failed with error: {e}")
        
        # Print summary
        print(f"\n📊 TEST SUMMARY")
        print(f"Tests run: {self.tests_run}")
        print(f"Tests passed: {self.tests_passed}")
        print(f"Tests failed: {self.tests_run - self.tests_passed}")
        print(f"Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        # Save detailed results
        with open('/app/test_reports/backend_test_results.json', 'w') as f:
            json.dump({
                "summary": {
                    "tests_run": self.tests_run,
                    "tests_passed": self.tests_passed,
                    "success_rate": self.tests_passed/self.tests_run*100 if self.tests_run > 0 else 0
                },
                "results": self.test_results,
                "timestamp": datetime.now().isoformat()
            }, f, indent=2)
        
        return self.tests_passed == self.tests_run

def main():
    tester = LinkedInGhostwriterTester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())