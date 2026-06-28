from app import create_app

# Create the Flask application
app = create_app()

# Run the development server
if __name__ == "__main__":
    app.run(
        debug=True,
        host="127.0.0.1",
        port=5000
    )