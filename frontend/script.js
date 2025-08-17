// Books will be loaded from backend API
let books = [];

// Cart state
let cart = [];

// DOM elements
const booksGrid = document.getElementById('booksGrid');
const cartSidebar = document.getElementById('cartSidebar');
const cartItems = document.getElementById('cartItems');
const cartCount = document.getElementById('cartCount');
const cartTotal = document.getElementById('cartTotal');
const checkoutModal = document.getElementById('checkoutModal');
const successModal = document.getElementById('successModal');
const checkoutForm = document.getElementById('checkoutForm');
const orderItems = document.getElementById('orderItems');
const orderTotal = document.getElementById('orderTotal');

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    loadBooks();
    updateCartDisplay();
    
    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Handle checkout form submission
    checkoutForm.addEventListener('submit', handleCheckout);
});

// Load books from backend API
async function loadBooks() {
    try {
        const response = await fetch('/api/books');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        books = await response.json();
        displayBooks();
    } catch (error) {
        console.error('Error loading books:', error);
        showNotification('Error loading books. Please try again.', 'error');
        // Fallback to empty state
        books = [];
        displayBooks();
    }
}

// Display books in the grid
function displayBooks() {
    booksGrid.innerHTML = '';
    
    if (books.length === 0) {
        booksGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 2rem;">
                <p style="color: #666; font-size: 1.1rem;">No books available at the moment.</p>
                <button onclick="loadBooks()" class="btn btn-primary" style="margin-top: 1rem;">
                    <i class="fas fa-refresh"></i> Refresh
                </button>
            </div>
        `;
        return;
    }
    
    books.forEach(book => {
        const bookCard = document.createElement('div');
        bookCard.className = 'book-card';
        bookCard.innerHTML = `
            <div class="book-image">
                <i class="fas fa-book"></i>
            </div>
            <div class="book-info">
                <h3 class="book-title">${book.title}</h3>
                <p class="book-author">by ${book.author}</p>
                <p class="book-price">$${book.price.toFixed(2)}</p>
                <p class="book-description">${book.description}</p>
                <p class="book-stock" style="color: ${book.stock > 0 ? '#27ae60' : '#e74c3c'}; font-weight: 600; margin-bottom: 1rem;">
                    ${book.stock > 0 ? `In Stock: ${book.stock}` : 'Out of Stock'}
                </p>
                <button class="add-to-cart" onclick="addToCart(${book.id})" ${book.stock <= 0 ? 'disabled' : ''}>
                    <i class="fas fa-cart-plus"></i> ${book.stock <= 0 ? 'Out of Stock' : 'Add to Cart'}
                </button>
            </div>
        `;
        booksGrid.appendChild(bookCard);
    });
}

// Add book to cart
function addToCart(bookId) {
    const book = books.find(b => b.id === bookId);
    if (!book) return;
    
    // Check stock availability
    if (book.stock <= 0) {
        showNotification('This book is out of stock!', 'error');
        return;
    }
    
    const existingItem = cart.find(item => item.id === bookId);
    
    if (existingItem) {
        // Check if adding more would exceed stock
        if (existingItem.quantity >= book.stock) {
            showNotification(`Only ${book.stock} copies available!`, 'error');
            return;
        }
        existingItem.quantity += 1;
    } else {
        cart.push({
            ...book,
            quantity: 1
        });
    }
    
    updateCartDisplay();
    showNotification('Book added to cart!', 'success');
}

// Remove book from cart
function removeFromCart(bookId) {
    cart = cart.filter(item => item.id !== bookId);
    updateCartDisplay();
    showNotification('Book removed from cart!', 'success');
}

// Update quantity in cart
function updateQuantity(bookId, change) {
    const item = cart.find(item => item.id === bookId);
    if (!item) return;
    
    const newQuantity = item.quantity + change;
    const book = books.find(b => b.id === bookId);
    
    if (newQuantity <= 0) {
        removeFromCart(bookId);
    } else if (newQuantity > book.stock) {
        showNotification(`Only ${book.stock} copies available!`, 'error');
    } else {
        item.quantity = newQuantity;
        updateCartDisplay();
    }
}

// Update cart display
function updateCartDisplay() {
    // Update cart count - show number of unique items, not total quantity
    const uniqueItemsCount = cart.length; // This counts unique items, not total quantity
    cartCount.textContent = uniqueItemsCount;
    
    // Update cart items
    cartItems.innerHTML = '';
    
    if (cart.length === 0) {
        cartItems.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">Your cart is empty</p>';
    } else {
        cart.forEach(item => {
            const cartItem = document.createElement('div');
            cartItem.className = 'cart-item';
            cartItem.innerHTML = `
                <div class="cart-item-image">
                    <i class="fas fa-book"></i>
                </div>
                <div class="cart-item-info">
                    <div class="cart-item-title">${item.title}</div>
                    <div class="cart-item-price">$${item.price.toFixed(2)}</div>
                    <div class="cart-item-quantity">
                        <button class="quantity-btn" onclick="updateQuantity(${item.id}, -1)">-</button>
                        <span>${item.quantity}</span>
                        <button class="quantity-btn" onclick="updateQuantity(${item.id}, 1)">+</button>
                    </div>
                </div>
                <button class="remove-item" onclick="removeFromCart(${item.id})">Remove</button>
            `;
            cartItems.appendChild(cartItem);
        });
    }
    
    // Update cart total
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cartTotal.textContent = `$${total.toFixed(2)}`;
}

// Toggle cart sidebar
function toggleCart() {
    cartSidebar.classList.toggle('open');
}

// Show notification with type
function showNotification(message, type = 'success') {
    // Create notification element
    const notification = document.createElement('div');
    const bgColor = type === 'error' ? '#e74c3c' : '#27ae60';
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${bgColor};
        color: white;
        padding: 1rem 2rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1003;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        max-width: 300px;
        word-wrap: break-word;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Checkout function
function checkout() {
    if (cart.length === 0) {
        showNotification('Your cart is empty!', 'error');
        return;
    }
    
    // Update order summary
    orderItems.innerHTML = '';
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    cart.forEach(item => {
        const orderItem = document.createElement('div');
        orderItem.className = 'order-item';
        orderItem.innerHTML = `
            <span>${item.title} x${item.quantity}</span>
            <span>$${(item.price * item.quantity).toFixed(2)}</span>
        `;
        orderItems.appendChild(orderItem);
    });
    
    orderTotal.textContent = `$${total.toFixed(2)}`;
    
    // Show checkout modal
    checkoutModal.classList.add('show');
}

// Close checkout modal
function closeCheckout() {
    checkoutModal.classList.remove('show');
}

// Handle checkout form submission with backend integration
async function handleCheckout(e) {
    e.preventDefault();
    
    // Show loading state
    const submitBtn = checkoutForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Processing...';
    submitBtn.disabled = true;
    
    try {
        // Get form data
        const formData = new FormData(checkoutForm);
        const orderData = {
            customer: {
                name: formData.get('name'),
                email: formData.get('email'),
                address: formData.get('address'),
                phone: formData.get('phone')
            },
            items: cart,
            total: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
        };
        
        // Send order to backend
        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(orderData)
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('Order placed successfully:', result);
            
            // Close checkout modal
            closeCheckout();
            
            // Show success modal
            successModal.classList.add('show');
            
            // Clear cart
            cart = [];
            updateCartDisplay();
            
            // Reset form
            checkoutForm.reset();
            
            // Reload books to update stock
            await loadBooks();
            
            showNotification('Order placed successfully!', 'success');
        } else {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to place order');
        }
    } catch (error) {
        console.error('Error placing order:', error);
        showNotification(error.message || 'Error placing order. Please try again.', 'error');
    } finally {
        // Reset button state
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// Close success modal
function closeSuccess() {
    successModal.classList.remove('show');
}

// Close modals when clicking outside
window.addEventListener('click', function(e) {
    if (e.target === checkoutModal) {
        closeCheckout();
    }
    if (e.target === successModal) {
        closeSuccess();
    }
});

// Close cart when clicking outside
window.addEventListener('click', function(e) {
    if (!cartSidebar.contains(e.target) && !e.target.closest('.cart-icon')) {
        cartSidebar.classList.remove('open');
    }
});

// Add some interactive features
document.addEventListener('DOMContentLoaded', function() {
    // Add loading animation
    setTimeout(() => {
        document.body.style.opacity = '1';
    }, 100);
});

// Add some CSS for loading animation
const style = document.createElement('style');
style.textContent = `
    body {
        opacity: 0;
        transition: opacity 0.5s ease;
    }
    
    .book-card {
        animation: fadeInUp 0.6s ease forwards;
    }
    
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    .book-card:nth-child(1) { animation-delay: 0.1s; }
    .book-card:nth-child(2) { animation-delay: 0.2s; }
    .book-card:nth-child(3) { animation-delay: 0.3s; }
    .book-card:nth-child(4) { animation-delay: 0.4s; }
    .book-card:nth-child(5) { animation-delay: 0.5s; }
    .book-card:nth-child(6) { animation-delay: 0.6s; }
    .book-card:nth-child(7) { animation-delay: 0.7s; }
    .book-card:nth-child(8) { animation-delay: 0.8s; }
    
    .add-to-cart:disabled {
        background: #ccc !important;
        cursor: not-allowed !important;
        transform: none !important;
    }
    
    .book-stock {
        font-size: 0.9rem;
        margin-bottom: 1rem;
    }
`;
document.head.appendChild(style);