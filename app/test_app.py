import unittest
from app import create_app

class BasicTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.client = self.app.test_client()

    def test_app_exists(self):
        self.assertIsNotNone(self.app)

if __name__ == '__main__':
    unittest.main()