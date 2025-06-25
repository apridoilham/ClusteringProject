# Advanced Clustering Analysis

This application is a web-based tool built with Flask to perform several data preprocessing and clustering analysis techniques, including Centering, Scaling, and Dendrogram visualization using Euclidean distance.

## Key Features

- **Dynamic Data Input**: Easily add or remove variables and data points through the interface.
- **Three Analysis Types**:
    1.  **Centering**: Centers the data by subtracting the mean value.
    2.  **Scaling**: Normalizes the data to a new range (Min-Max Scaling).
    3.  **Euclidean**: Calculates the Euclidean distance matrix and generates a clear, interactive Dendrogram visualization.
- **Calculation History**: Every calculation is saved in the browser's `localStorage`, allowing users to review previous results.
- **Professional User Experience (UX)**:
    - Confirmation dialogs for critical actions.
    - Clear form validation feedback.
    - Informative "Empty State" displays.
    - The dendrogram can be enlarged for detailed analysis.
- **Clean and Modern Design**: A responsive dark-themed interface using TailwindCSS.
- **Structured Code**: Modular JavaScript and a robust Python backend.

## Technologies Used

- **Backend**: Flask (Python)
- **Frontend**: HTML, TailwindCSS, JavaScript, GSAP
- **Python Libraries**: Pandas, NumPy, SciPy, Matplotlib

## How to Run

1.  **Clone the Repository**
    ```bash
    git clone [https://github.com/apridoilham/ClusteringProject.git](https://github.com/apridoilham/ClusteringProject.git)
    cd project-directory-name
    ```

2.  **Create and Activate a Virtual Environment**
    ```bash
    python -m venv venv
    # Windows: .\venv\Scripts\activate
    # macOS/Linux: source venv/bin/activate
    ```

3.  **Install Dependencies**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Run the Flask Application**
    ```bash
    flask run
    ```

5.  Open your browser and navigate to `http://127.0.0.1:5000`