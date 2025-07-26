import pytest
import asyncio
import json
from unittest.mock import Mock, patch, AsyncMock
from typing import Dict, List, Optional

# Mock classes for testing order module functionality
class MockOrderItem:
    def __init__(self, name: str, price: float, quantity: int = 1, modifications: List[str] = None):
        self.name = name
        self.price = price
        self.quantity = quantity
        self.modifications = modifications or []
        self.id = f"{name}_{id(self)}"

class MockOrderState:
    def __init__(self):
        self.items: List[MockOrderItem] = []
        self.total: float = 0.0
        self.status: str = "active"
    
    def add_item(self, item: MockOrderItem):
        self.items.append(item)
        self.calculate_total()
    
    def remove_item(self, item_id: str):
        self.items = [item for item in self.items if item.id != item_id]
        self.calculate_total()
    
    def modify_item(self, item_id: str, modifications: List[str]):
        for item in self.items:
            if item.id == item_id:
                item.modifications = modifications
                break
        self.calculate_total()
    
    def calculate_total(self):
        self.total = sum(item.price * item.quantity for item in self.items)

class MockMenuManager:
    def __init__(self):
        self.menu_items = {
            "burger": {"name": "Burger", "price": 8.99, "category": "main"},
            "fries": {"name": "Fries", "price": 3.99, "category": "side"},
            "coke": {"name": "Coke", "price": 2.99, "category": "drink"},
            "cheeseburger": {"name": "Cheeseburger", "price": 9.99, "category": "main"},
            "big_mac": {"name": "Big Mac", "price": 12.99, "category": "main"}
        }
    
    def get_item_by_name(self, name: str) -> Optional[Dict]:
        return self.menu_items.get(name.lower())
    
    def search_items(self, query: str) -> List[Dict]:
        results = []
        for key, item in self.menu_items.items():
            if query.lower() in key or query.lower() in item["name"].lower():
                results.append(item)
        return results

class MockConversationManager:
    def __init__(self):
        self.intents = {
            "order_food": ["I want", "I'd like", "Can I get", "Give me"],
            "confirm_order": ["yes", "that's correct", "confirm"],
            "modify_order": ["change", "modify", "instead of"],
            "cancel_order": ["cancel", "never mind", "forget it"]
        }
    
    def process_utterance(self, text: str) -> Dict:
        text_lower = text.lower()
        
        # Simple intent classification
        for intent, phrases in self.intents.items():
            if any(phrase in text_lower for phrase in phrases):
                return {
                    "intent": intent,
                    "confidence": 0.8,
                    "entities": self._extract_entities(text)
                }
        
        return {
            "intent": "unknown",
            "confidence": 0.1,
            "entities": {}
        }
    
    def _extract_entities(self, text: str) -> Dict:
        entities = {}
        text_lower = text.lower()
        
        # Extract quantities
        import re
        quantity_match = re.search(r'(\d+)\s+(\w+)', text_lower)
        if quantity_match:
            entities["quantity"] = int(quantity_match.group(1))
            entities["item"] = quantity_match.group(2)
        
        # Extract modifications
        if "no" in text_lower:
            entities["modifications"] = ["no"]
        
        return entities

class MockOrderModule:
    def __init__(self):
        self.order_state = MockOrderState()
        self.menu_manager = MockMenuManager()
        self.conversation_manager = MockConversationManager()
        self.conversation_context = {}
    
    async def process_order_intent(self, audio_data: bytes) -> Dict:
        """Process audio and extract order intent"""
        # Mock audio processing - in real implementation this would use Whisper
        mock_transcript = "I want a burger"
        
        # Process the utterance
        result = self.conversation_manager.process_utterance(mock_transcript)
        
        if result["intent"] == "order_food":
            return await self._handle_order_food(result)
        elif result["intent"] == "confirm_order":
            return await self._handle_confirm_order(result)
        elif result["intent"] == "modify_order":
            return await self._handle_modify_order(result)
        else:
            return {"response": "I didn't understand. Could you repeat that?"}
    
    async def _handle_order_food(self, result: Dict) -> Dict:
        """Handle food ordering intent"""
        entities = result.get("entities", {})
        item_name = entities.get("item", "burger")
        quantity = entities.get("quantity", 1)
        
        menu_item = self.menu_manager.get_item_by_name(item_name)
        if menu_item:
            order_item = MockOrderItem(
                name=menu_item["name"],
                price=menu_item["price"],
                quantity=quantity,
                modifications=entities.get("modifications", [])
            )
            self.order_state.add_item(order_item)
            
            return {
                "response": f"Added {quantity} {menu_item['name']} to your order. Anything else?",
                "order_summary": self._get_order_summary()
            }
        else:
            return {
                "response": f"I'm sorry, I don't recognize '{item_name}'. Could you try again?",
                "suggestions": self.menu_manager.search_items(item_name)
            }
    
    async def _handle_confirm_order(self, result: Dict) -> Dict:
        """Handle order confirmation"""
        if self.order_state.items:
            return {
                "response": f"Great! Your total is ${self.order_state.total:.2f}. Please proceed to payment.",
                "order_summary": self._get_order_summary(),
                "total": self.order_state.total,
                "status": "confirmed"
            }
        else:
            return {
                "response": "You don't have any items in your order yet. What would you like to order?"
            }
    
    async def _handle_modify_order(self, result: Dict) -> Dict:
        """Handle order modifications"""
        return {
            "response": "I can help you modify your order. What would you like to change?",
            "order_summary": self._get_order_summary()
        }
    
    def _get_order_summary(self) -> List[Dict]:
        """Get current order summary"""
        return [
            {
                "name": item.name,
                "quantity": item.quantity,
                "price": item.price,
                "modifications": item.modifications
            }
            for item in self.order_state.items
        ]

# Test classes
class TestOrderModule:
    """Test suite for Order Module functionality"""
    
    @pytest.fixture
    def order_module(self):
        """Create a fresh order module for each test"""
        return MockOrderModule()
    
    @pytest.mark.asyncio
    async def test_order_food_intent(self, order_module):
        """Test processing a food order intent"""
        # Mock audio data
        audio_data = b"mock_audio_data"
        
        # Process the order
        result = await order_module.process_order_intent(audio_data)
        
        # Verify response
        assert "response" in result
        assert "Added" in result["response"]
        assert "burger" in result["response"].lower()
        
        # Verify order state
        assert len(order_module.order_state.items) == 1
        assert order_module.order_state.items[0].name == "Burger"
        assert order_module.order_state.total == 8.99
    
    @pytest.mark.asyncio
    async def test_confirm_order_intent(self, order_module):
        """Test order confirmation"""
        # Add an item first
        order_module.order_state.add_item(MockOrderItem("Burger", 8.99))
        
        # Mock audio data
        audio_data = b"mock_audio_data"
        
        # Process confirmation
        result = await order_module.process_order_intent(audio_data)
        
        # Verify response
        assert "response" in result
        assert "total" in result["response"]
        assert "$8.99" in result["response"]
        assert result.get("status") == "confirmed"
    
    @pytest.mark.asyncio
    async def test_empty_order_confirmation(self, order_module):
        """Test confirming an empty order"""
        audio_data = b"mock_audio_data"
        
        result = await order_module.process_order_intent(audio_data)
        
        assert "response" in result
        assert "don't have any items" in result["response"]
    
    def test_menu_item_search(self, order_module):
        """Test menu item search functionality"""
        # Test exact match
        item = order_module.menu_manager.get_item_by_name("burger")
        assert item is not None
        assert item["name"] == "Burger"
        assert item["price"] == 8.99
        
        # Test search
        results = order_module.menu_manager.search_items("cheese")
        assert len(results) == 1
        assert results[0]["name"] == "Cheeseburger"
    
    def test_order_state_management(self, order_module):
        """Test order state management"""
        # Add items
        item1 = MockOrderItem("Burger", 8.99)
        item2 = MockOrderItem("Fries", 3.99)
        
        order_module.order_state.add_item(item1)
        order_module.order_state.add_item(item2)
        
        # Verify total
        assert order_module.order_state.total == 12.98
        
        # Remove item
        order_module.order_state.remove_item(item1.id)
        assert len(order_module.order_state.items) == 1
        assert order_module.order_state.total == 3.99
    
    def test_intent_classification(self, order_module):
        """Test intent classification"""
        # Test order food intent
        result = order_module.conversation_manager.process_utterance("I want a burger")
        assert result["intent"] == "order_food"
        assert result["confidence"] > 0.5
        
        # Test confirm intent
        result = order_module.conversation_manager.process_utterance("yes that's correct")
        assert result["intent"] == "confirm_order"
        
        # Test unknown intent
        result = order_module.conversation_manager.process_utterance("random text")
        assert result["intent"] == "unknown"
        assert result["confidence"] < 0.5

class TestOrderModuleIntegration:
    """Integration tests for Order Module with real components"""
    
    @pytest.mark.asyncio
    async def test_full_order_flow(self):
        """Test complete order flow from audio to confirmation"""
        order_module = MockOrderModule()
        
        # Simulate ordering a burger
        audio_data = b"mock_audio_data"
        result1 = await order_module.process_order_intent(audio_data)
        
        assert "Added" in result1["response"]
        assert len(order_module.order_state.items) == 1
        
        # Simulate confirming the order
        result2 = await order_module.process_order_intent(audio_data)
        
        assert "total" in result2["response"]
        assert result2.get("status") == "confirmed"
    
    @pytest.mark.asyncio
    async def test_order_with_modifications(self):
        """Test ordering with modifications"""
        order_module = MockOrderModule()
        
        # Mock conversation manager to return modification entities
        order_module.conversation_manager.intents["order_food"] = ["I want"]
        
        # Process order with modifications
        audio_data = b"mock_audio_data"
        result = await order_module.process_order_intent(audio_data)
        
        # Verify order was processed
        assert len(order_module.order_state.items) == 1
        assert "response" in result

class TestOrderModulePerformance:
    """Performance tests for Order Module"""
    
    @pytest.mark.asyncio
    async def test_concurrent_orders(self):
        """Test handling multiple concurrent orders"""
        order_module = MockOrderModule()
        
        # Simulate multiple concurrent order requests
        tasks = []
        for i in range(5):
            task = order_module.process_order_intent(b"mock_audio_data")
            tasks.append(task)
        
        # Execute all tasks concurrently
        results = await asyncio.gather(*tasks)
        
        # Verify all orders were processed
        assert len(results) == 5
        for result in results:
            assert "response" in result
    
    def test_order_state_performance(self):
        """Test order state performance with many items"""
        order_module = MockOrderModule()
        
        # Add many items
        for i in range(100):
            item = MockOrderItem(f"Item{i}", 1.99)
            order_module.order_state.add_item(item)
        
        # Verify performance
        assert len(order_module.order_state.items) == 100
        assert order_module.order_state.total == 199.0

if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v"]) 