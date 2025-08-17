from flask import Flask, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from datetime import datetime
import os

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your-secret-key-here')
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///bookstore.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
CORS(app)

# Database Models
class Book(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    author = db.Column(db.String(100), nullable=False)
    price = db.Column(db.Float, nullable=False)
    description = db.Column(db.Text, nullable=False)
    genre = db.Column(db.String(50), nullable=False)
    stock = db.Column(db.Integer, default=10)
    image_url = db.Column(db.String(500), default='')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    phone = db.Column(db.String(20))
    address = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    orders = db.relationship('Order', backref='user', lazy=True)

class Order(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    total_amount = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(20), default='pending')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    order_items = db.relationship('OrderItem', backref='order', lazy=True)

class OrderItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('order.id'), nullable=False)
    book_id = db.Column(db.Integer, db.ForeignKey('book.id'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    price = db.Column(db.Float, nullable=False)
    book = db.relationship('Book', backref='order_items')

# Frontend Routes
@app.route('/')
def index():
    return send_from_directory('../frontend', 'index.html')

@app.route('/<path:filename>')
def serve_frontend(filename):
    return send_from_directory('../frontend', filename)

# API Routes
@app.route('/api/books', methods=['GET'])
def get_books():
    """Get all books"""
    books = Book.query.all()
    return jsonify([{
        'id': book.id,
        'title': book.title,
        'author': book.author,
        'price': book.price,
        'description': book.description,
        'genre': book.genre,
        'stock': book.stock,
        'image_url': book.image_url
    } for book in books])

@app.route('/api/books/<int:book_id>', methods=['GET'])
def get_book(book_id):
    """Get a specific book"""
    book = Book.query.get_or_404(book_id)
    return jsonify({
        'id': book.id,
        'title': book.title,
        'author': book.author,
        'price': book.price,
        'description': book.description,
        'genre': book.genre,
        'stock': book.stock,
        'image_url': book.image_url
    })

@app.route('/api/orders', methods=['POST'])
def create_order():
    """Create a new order"""
    data = request.get_json()
    
    # Create or get user
    user = User.query.filter_by(email=data['customer']['email']).first()
    if not user:
        user = User(
            name=data['customer']['name'],
            email=data['customer']['email'],
            phone=data['customer'].get('phone', ''),
            address=data['customer'].get('address', '')
        )
        db.session.add(user)
        db.session.commit()
    
    # Create order
    order = Order(
        user_id=user.id,
        total_amount=data['total'],
        status='pending'
    )
    db.session.add(order)
    db.session.commit()
    
    # Create order items and update stock
    for item in data['items']:
        book = Book.query.get(item['id'])
        if book and book.stock >= item['quantity']:
            order_item = OrderItem(
                order_id=order.id,
                book_id=book.id,
                quantity=item['quantity'],
                price=book.price
            )
            db.session.add(order_item)
            book.stock -= item['quantity']
        else:
            db.session.rollback()
            return jsonify({'message': f'Insufficient stock for {book.title}'}), 400
    
    db.session.commit()
    return jsonify({'message': 'Order created successfully', 'order_id': order.id}), 201

@app.route('/api/orders/<int:order_id>', methods=['GET'])
def get_order(order_id):
    """Get order details"""
    order = Order.query.get_or_404(order_id)
    
    return jsonify({
        'id': order.id,
        'user_id': order.user_id,
        'total_amount': order.total_amount,
        'status': order.status,
        'created_at': order.created_at.isoformat(),
        'items': [{
            'book_title': item.book.title,
            'quantity': item.quantity,
            'price': item.price
        } for item in order.order_items]
    })

@app.route('/api/orders', methods=['GET'])
def get_orders():
    """Get all orders (admin function)"""
    orders = Order.query.all()
    return jsonify([{
        'id': order.id,
        'user_id': order.user_id,
        'total_amount': order.total_amount,
        'status': order.status,
        'created_at': order.created_at.isoformat()
    } for order in orders])

@app.route('/api/orders/<int:order_id>/status', methods=['PUT'])
def update_order_status(order_id):
    """Update order status (admin function)"""
    data = request.get_json()
    order = Order.query.get_or_404(order_id)
    order.status = data['status']
    db.session.commit()
    
    return jsonify({'message': 'Order status updated successfully'})

@app.route('/api/books/<int:book_id>/stock', methods=['PUT'])
def update_book_stock(book_id):
    """Update book stock (admin function)"""
    data = request.get_json()
    book = Book.query.get_or_404(book_id)
    book.stock = data['stock']
    db.session.commit()
    
    return jsonify({'message': 'Book stock updated successfully'})

# Initialize database with sample data
def init_db():
    with app.app_context():
        db.create_all()
        
        if Book.query.count() == 0:
            sample_books = [
                {
                    'title': 'The Great Gatsby',
                    'author': 'F. Scott Fitzgerald',
                    'price': 12.99,
                    'description': 'A classic American novel about the Jazz Age and the American Dream.',
                    'genre': 'Fiction',
                    'stock': 15
                },
                {
                    'title': 'To Kill a Mockingbird',
                    'author': 'Harper Lee',
                    'price': 14.99,
                    'description': 'A powerful story about racial injustice and the loss of innocence in the American South.',
                    'genre': 'Fiction',
                    'stock': 12
                },
                {
                    'title': '1984',
                    'author': 'George Orwell',
                    'price': 11.99,
                    'description': 'A dystopian novel about totalitarianism and surveillance society.',
                    'genre': 'Fiction',
                    'stock': 20
                },
                {
                    'title': 'Pride and Prejudice',
                    'author': 'Jane Austen',
                    'price': 9.99,
                    'description': 'A romantic novel of manners about the relationship between Elizabeth Bennet and Mr. Darcy.',
                    'genre': 'Romance',
                    'stock': 18
                },
                {
                    'title': 'The Hobbit',
                    'author': 'J.R.R. Tolkien',
                    'price': 16.99,
                    'description': 'A fantasy novel about Bilbo Baggins\' journey with thirteen dwarves to reclaim their homeland.',
                    'genre': 'Fantasy',
                    'stock': 10
                },
                {
                    'title': 'The Catcher in the Rye',
                    'author': 'J.D. Salinger',
                    'price': 13.99,
                    'description': 'A coming-of-age story about teenage alienation and loss of innocence.',
                    'genre': 'Fiction',
                    'stock': 14
                },
                {
                    'title': 'Lord of the Flies',
                    'author': 'William Golding',
                    'price': 10.99,
                    'description': 'A novel about the dark side of human nature when civilization breaks down.',
                    'genre': 'Fiction',
                    'stock': 16
                },
                {
                    'title': 'Animal Farm',
                    'author': 'George Orwell',
                    'price': 8.99,
                    'description': 'An allegorical novella about the Russian Revolution and the rise of Stalinism.',
                    'genre': 'Political Fiction',
                    'stock': 22
                }
            ]
            
            for book_data in sample_books:
                book = Book(**book_data)
                db.session.add(book)
            
            db.session.commit()
            print("Sample books added to database!")


if __name__ == '__main__':
    init_db()
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=False, host='0.0.0.0', port=port)