# Setup Complete Class Progression

## Overview
This script sets up the full chain of class promotions for the entire school, ensuring every class knows exactly where to send promoted students.

## Progression Path Defined
*   **KG 1** → **KG 2**
*   **KG 2** → **Basic 1**
*   **Basic 1** → **Basic 2**
*   **Basic 2** → **Basic 3**
*   **Basic 3** → **Basic 4**
*   **Basic 4** → **Basic 5**
*   **Basic 5** → **Basic 6**
*   **Basic 6** → **Basic 7** (JHS 1)
*   **Basic 7** → **Basic 8** (JHS 2)
*   **Basic 8** → **Basic 9** (JHS 3)
*   **Basic 9** → **Graduated**

## Instructions

1.  **Run the Setup Script**:
    *   Open your Supabase SQL Editor.
    *   Copy the contents of `database/setup-complete-class-progression.sql`.
    *   Run the script.
    *   This will **clear any existing rules** and replace them with this complete, verified set.

2.  **Verify**:
    *   You can now promote students from any class, and they will correctly move to the next level.
