import tkinter as tk
from tkinter import ttk, messagebox
import mysql.connector
import bcrypt
import pandas as pd
import matplotlib.pyplot as plt
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
import plotly.express as px
import plotly.graph_objects as go  # Add this line

import io
import base64
import seaborn as sns

BG_COLOR = "#121212"
TEXT_COLOR = "#F4F4F4"
ACCENT_BLUE = "#469CFF"
ACCENT_PURPLE = "#8A2BE2"
ACCENT_CYAN = "#00D4FF"
# Database connection function
def connect_db():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="your_password",  # Update this
        database="callsCraft"
    )

class LoginWindow:
    def __init__(self, root):
        self.root = root
        self.root.title("Login")
        self.root.geometry("1280x720")
        self.root.configure(bg=BG_COLOR)

        tk.Label(root, text="Email:", fg=TEXT_COLOR, bg=BG_COLOR, font=("Arial", 12)).pack(pady=5)
        self.email_entry = tk.Entry(root, font=("Arial", 12))
        self.email_entry.pack(pady=5)

        tk.Label(root, text="Password:", fg=TEXT_COLOR, bg=BG_COLOR, font=("Arial", 12)).pack(pady=5)
        self.password_entry = tk.Entry(root, show="*", font=("Arial", 12))
        self.password_entry.pack(pady=5)

        tk.Button(root, text="Login", command=self.login, bg=ACCENT_BLUE, fg="white", font=("Arial", 12), width=15).pack(pady=10)
        tk.Button(root, text="Signup", command=self.open_signup, bg=ACCENT_PURPLE, fg="white", font=("Arial", 12), width=15).pack(pady=5)

    def login(self):
        email = self.email_entry.get()
        password = self.password_entry.get()

        conn = connect_db()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM User WHERE Email = %s", (email,))
        user = cursor.fetchone()
        cursor.close()
        conn.close()

        if user and bcrypt.checkpw(password.encode("utf-8"), user["Password"].encode("utf-8")):
            self.root.destroy()
            DashboardWindow(user["UserID"], user["Name"])
        else:
            messagebox.showerror("Error", "Invalid email or password")

    def open_signup(self):
        self.root.destroy()
        SignupWindow()

class SignupWindow:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("Signup")
        self.root.geometry("1280x720")
        self.root.configure(bg=BG_COLOR)

        tk.Label(self.root, text="Name:", fg=TEXT_COLOR, bg=BG_COLOR, font=("Arial", 12)).pack(pady=5)
        self.name_entry = tk.Entry(self.root, font=("Arial", 12))
        self.name_entry.pack(pady=5)

        tk.Label(self.root, text="Email:", fg=TEXT_COLOR, bg=BG_COLOR, font=("Arial", 12)).pack(pady=5)
        self.email_entry = tk.Entry(self.root, font=("Arial", 12))
        self.email_entry.pack(pady=5)

        tk.Label(self.root, text="Password:", fg=TEXT_COLOR, bg=BG_COLOR, font=("Arial", 12)).pack(pady=5)
        self.password_entry = tk.Entry(self.root, show="*", font=("Arial", 12))
        self.password_entry.pack(pady=5)

        tk.Button(self.root, text="Signup", command=self.signup, bg=ACCENT_PURPLE, fg="white", font=("Arial", 12), width=15).pack(pady=10)

    def signup(self):
        name = self.name_entry.get()
        email = self.email_entry.get()
        password = self.password_entry.get()

        conn = connect_db()
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM User WHERE Email = %s", (email,))
        if cursor.fetchone():
            messagebox.showerror("Error", "Email already registered")
            return

        hashed_password = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        cursor.execute("INSERT INTO User (Name, Email, Password) VALUES (%s, %s, %s)", (name, email, hashed_password))
        conn.commit()
        cursor.close()
        conn.close()

        messagebox.showinfo("Success", "Signup successful! Please login.")
        self.root.destroy()
        main()

class DashboardWindow:
    def __init__(self, user_id, name):
        self.root = tk.Tk()
        self.root.title("Dashboard")
        self.root.geometry("1280x720")
        self.root.configure(bg=BG_COLOR)

        self.user_id = user_id
        self.name = name

        tk.Label(self.root, text=f"Welcome, {self.name}", fg=TEXT_COLOR, bg=BG_COLOR, font=("Arial", 16, "bold")).pack(pady=10)
        
        conn = connect_db()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT ClientID, Name FROM Client WHERE UserID = %s", (self.user_id,))
        self.clients = cursor.fetchall()
        cursor.close()
        conn.close()

        self.client_var = tk.StringVar()
        client_names = [client["Name"] for client in self.clients]
        self.client_dropdown = ttk.Combobox(self.root, textvariable=self.client_var, values=client_names, font=("Arial", 12))
        self.client_dropdown.pack(pady=10)

        tk.Button(self.root, text="Show Analytics", command=self.show_analytics, bg=ACCENT_CYAN, fg="black", font=("Arial", 12), width=15).pack(pady=10)

        self.root.mainloop()

    def show_analytics(self):
        selected_client = self.client_var.get()
        client_id = next((c["ClientID"] for c in self.clients if c["Name"] == selected_client), None)

        if not client_id:
            messagebox.showerror("Error", "Please select a client")
            return

        AnalyticsWindow(client_id, selected_client)


class AnalyticsWindow:
    def __init__(self, client_id, client_name):
        self.root = tk.Tk()
        self.root.title(f"📊 Analytics - {client_name}")
        self.root.geometry("1280x720")


        # Create scrollable frame
        self.canvas = tk.Canvas(self.root, bg="#F4F4F4")
        self.scrollbar = ttk.Scrollbar(self.root, orient="vertical", command=self.canvas.yview)
        self.scrollable_frame = ttk.Frame(self.canvas)

        self.scrollable_frame.bind("<Configure>", lambda e: self.canvas.configure(scrollregion=self.canvas.bbox("all")))
        self.canvas.create_window((0, 0), window=self.scrollable_frame, anchor="nw")
        self.canvas.configure(yscrollcommand=self.scrollbar.set)

        self.canvas.pack(side="left", fill="both", expand=True)
        self.scrollbar.pack(side="right", fill="y")
        
        conn = connect_db()
        cursor = conn.cursor(dictionary=True)

        # Fetch Client Details, Call Count, Last Call Date
        cursor.execute("""
            SELECT c.Name AS ClientName, c.ClientID, u.Name AS AssignedUser, 
                COUNT(m.CallID) AS TotalCalls, 
                MAX(m.EndTime) AS LastCallDate
            FROM Client c
            LEFT JOIN meetingCall m ON c.ClientID = m.ClientID
            LEFT JOIN User u ON c.UserID = u.UserID
            WHERE c.ClientID = %s
            GROUP BY c.ClientID
        """, (client_id,))

        client_info = cursor.fetchone()

        # Fetch Latest Call Analytics
        cursor.execute("""
            SELECT ar.Sentiment, an.FocusScore, an.CognitiveResonanceScore
            FROM AudioResults ar
            JOIN meetingCall m ON ar.CallID = m.CallID
            JOIN Analytics an ON an.CallID = m.CallID
            WHERE m.ClientID = %s
            ORDER BY m.EndTime DESC
            LIMIT 1
        """, (client_id,))

        analytics_info = cursor.fetchone()

        # Fetch Pending Tasks
        cursor.execute("""
            SELECT COUNT(*) AS PendingTasks
            FROM Task
            WHERE ClientID = %s AND Status = FALSE
        """, (client_id,))

        tasks_info = cursor.fetchone()

        # Fetch Latest Note
        cursor.execute("""
            SELECT Content, Timestamp
            FROM Note
            WHERE CallID IN (SELECT CallID FROM meetingCall WHERE ClientID = %s)
            ORDER BY Timestamp DESC
            LIMIT 1
        """, (client_id,))

        note_info = cursor.fetchone()

        cursor.close()
        conn.close()

        # Display in GUI
        if client_info:
            details_frame = ttk.Frame(self.scrollable_frame)
            details_frame.pack(fill="both", expand=True)
            details_frame.config(width=1280, height=720)


            tk.Label(details_frame, text="🧑‍💼 Customer Details", font=("Arial", 14, "bold")).pack(anchor="w")

            details_text = f"""
            Name: {client_info['ClientName']}
            Assigned User: {client_info['AssignedUser']}
            Total Calls: {client_info['TotalCalls']}
            Last Call Date: {client_info['LastCallDate'] if client_info['LastCallDate'] else "N/A"}
            """
            tk.Label(details_frame, text=details_text, font=("Arial", 12), justify="left", anchor="w").pack(anchor="w")

            if analytics_info:
                analytics_text = f"""
                🔹 Sentiment: {analytics_info['Sentiment']}
                🔹 Focus Score: {analytics_info['FocusScore']}
                🔹 Cognitive Resonance: {analytics_info['CognitiveResonanceScore']}
                """
                tk.Label(details_frame, text=analytics_text, font=("Arial", 12), fg="blue").pack(anchor="w")

            if tasks_info and tasks_info['PendingTasks'] > 0:
                task_text = f"🔔 Pending Tasks: {tasks_info['PendingTasks']}"
                tk.Label(details_frame, text=task_text, font=("Arial", 12), fg="red").pack(anchor="w")

            if note_info:
                note_text = f"📝 Last Note: {note_info['Content']} (Added: {note_info['Timestamp']})"
                tk.Label(details_frame, text=note_text, font=("Arial", 12), fg="green").pack(anchor="w")

        else:
            tk.Label(self.scrollable_frame, text="No customer details found!", font=("Arial", 12, "italic")).pack(pady=5)


        # Connect to DB and fetch data
        conn = connect_db()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT mc.CallID, mc.StartTime, mc.EndTime,
                   ar.Sentiment, vr.GazeDirection, vr.Emotion,
                   ag.AttentionEconomicsScore, ag.MoodInductionScore, ag.CognitiveResonanceScore,
                   an.BodyAlignment, an.GazeDirection AS AnalyticsGaze, an.Emotion AS AnalyticsEmotion, 
                   an.SpeechEmotion, an.FocusScore, an.CognitiveResonanceScore AS AnalyticsCognitiveScore
            FROM meetingCall mc
            LEFT JOIN AudioResults ar ON mc.CallID = ar.CallID
            LEFT JOIN VideoResults vr ON mc.CallID = vr.CallID
            LEFT JOIN AggregatedResults ag ON mc.CallID = ag.CallID
            LEFT JOIN Analytics an ON mc.CallID = an.CallID
            WHERE mc.ClientID = %s
        """, (client_id,))

        call_data = cursor.fetchall()
        cursor.close()
        conn.close()

        if not call_data:
            messagebox.showinfo("No Data", "No calls found for this client")
            return

        # Convert data to DataFrame
        df = pd.DataFrame(call_data)
        df["StartTime"] = pd.to_datetime(df["StartTime"])
        df.sort_values(by="StartTime", inplace=True)

        # Ensure unique timestamps
        df["StartTime"] += pd.to_timedelta(range(len(df)), unit="s")

        # 📈 Line Chart: Score Trends Over Time
        self.create_plotly_chart(df, "StartTime", ["AttentionEconomicsScore", "MoodInductionScore", "CognitiveResonanceScore"],
                                 "📈 Score Trends Over Time", "line")

        # 📊 Pie Chart: Sentiment Distribution
        if "Sentiment" in df.columns:
            self.create_pie_chart(df, "Sentiment", "📊 Sentiment Distribution")

        # 📊 Bar Chart: Engagement Score Comparison
        self.create_plotly_chart(df, "StartTime", ["AttentionEconomicsScore", "MoodInductionScore", "CognitiveResonanceScore"],
                                 "📊 Engagement Score Comparison", "bar")

        # 🔥 Heatmap: Score Correlations
        self.create_heatmap(df, ["AttentionEconomicsScore", "MoodInductionScore", "CognitiveResonanceScore"],
                            "🔥 Correlation Between Scores")


        # 📊 Histogram: Speech Emotion Distribution
        if "SpeechEmotion" in df.columns:
            self.create_histogram(df, "SpeechEmotion", "🎤 Speech Emotion Distribution")

        # 🎭 Violin Plot: Emotion Variability
        if "Emotion" in df.columns:
            self.create_violin_plot(df, "Emotion", "🎭 Emotion Variability")

        # 📦 Box Plot: Engagement Score Spread
        self.create_box_plot(df, ["AttentionEconomicsScore", "MoodInductionScore", "CognitiveResonanceScore"],
                              "📦 Engagement Score Spread")

        self.root.mainloop()

    # 📈 Create Line/Bar Charts
    def create_plotly_chart(self, df, x_column, y_columns, title, chart_type="line"):
        fig = go.Figure()

        # Ensure time column is parsed correctly
        df[x_column] = pd.to_datetime(df[x_column])

        # Round timestamps to the nearest 30 minutes
        df["Interval"] = df[x_column].dt.floor("5T")

        # Aggregate data per 30-minute interval (e.g., averaging scores)
        df_grouped = df.groupby("Interval")[y_columns].mean().reset_index()

        # Convert time to string for better visualization
        formatted_time = df_grouped["Interval"].dt.strftime("%H:%M")

        # Get min/max values for dynamic y-axis scaling
        y_min, y_max = df_grouped[y_columns].min().min(), df_grouped[y_columns].max().max()
        
        # Ensure a small buffer to make variations visible
        y_range = [y_min - 0.005, y_max + 0.005]  

        for col in y_columns:
            if col in df_grouped.columns:
                if chart_type == "line":
                    fig.add_trace(go.Scatter(
                        x=formatted_time,
                        y=df_grouped[col],
                        mode="lines+markers",
                        name=col,
                        marker=dict(size=6)
                    ))
                elif chart_type == "bar":
                    fig.add_trace(go.Bar(
                        x=formatted_time,
                        y=df_grouped[col],
                        name=col
                    ))

        fig.update_layout(
            title=title,
            xaxis_title="Time (HH:MM)",
            yaxis_title="Score",
            xaxis=dict(tickangle=-45),
            yaxis=dict(
                tickformat=".2f",  # Ensure five decimal places
                tickmode="linear",  # Ensures evenly spaced ticks
                dtick=0.001,  # Forces y-axis increments of 0.001
                range=y_range  # Dynamic range for better visualization
            ),
            template="plotly_dark",
            hovermode="x unified",
            legend=dict(title="Metrics", x=0.02, y=1.02, bgcolor="rgba(0,0,0,0)")
        )

        print("Min Values:\n", df_grouped[y_columns].min())
        print("Max Values:\n", df_grouped[y_columns].max())

        fig.show()

    # 📊 Pie Chart
    def create_pie_chart(self, df, column, title):
        fig = px.pie(df, names=column, title=title)
        fig.show()

    # 🎯 Scatter Plot
    def create_scatter_chart(self, df, x_column, y_column, title):
        fig = px.scatter(df, x=x_column, y=y_column, color="AttentionEconomicsScore",
                         title=title, color_continuous_scale="Viridis")
        fig.show()

    # 🔥 Heatmap for Correlations
    def create_heatmap(self, df, columns, title):
        correlation = df[columns].corr()
        fig = px.imshow(correlation, text_auto=True, aspect="auto",
                        title=title, color_continuous_scale="RdBu_r")
        fig.show()

    # 📊 Histogram
    def create_histogram(self, df, column, title):
        fig = px.histogram(df, x=column, nbins=20, title=title)

        # Format x-axis and y-axis to show 4 decimal places
        fig.update_layout(
            xaxis=dict(tickformat=".4f"),  
            yaxis=dict(tickformat=".4f", tickmode="linear", dtick=0.01)  # Adjust dtick for finer granularity
        )

        fig.show()



    # 🎭 Violin Plot for Variability
    def create_violin_plot(self, df, column, title):
        fig = px.violin(df, y=column, box=True, points="all", title=title)
        fig.show()

    # 📦 Box Plot for Score Spread
    def create_box_plot(self, df, columns, title):
        fig = px.box(df[columns], title=title)
        fig.show()


def main():
    root = tk.Tk()
    LoginWindow(root)
    root.mainloop()

if __name__ == "__main__":
    main()
