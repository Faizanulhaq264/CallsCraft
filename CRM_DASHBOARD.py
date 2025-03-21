import tkinter as tk
from tkinter import ttk, messagebox, Canvas

import mysql.connector
import bcrypt
import pandas as pd
import plotly.express as px
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
import matplotlib.pyplot as plt
import seaborn as sns

# Database connection function
def connect_db():
    try:
        return mysql.connector.connect(
            host="localhost",
            user="root",
            password="your_password",  # Update this
            database="callsCraft"
        )
    except mysql.connector.Error as err:
        messagebox.showerror("Database Error", f"Error: {err}")
        return None
def fetch_client_data(client_id):
        conn = connect_db()
        
        if not conn:
            print("Error: Could not connect to database.")
            return pd.DataFrame(), pd.DataFrame()

        try:
            cursor1 = conn.cursor(dictionary=True)
            cursor2 = conn.cursor(dictionary=True)

            # First Query: Fetch meetingCall data
            cursor1.execute("""
                SELECT mc.CallID, mc.StartTime, mc.EndTime, ar.Sentiment, vr.GazeDirection, vr.Emotion,
                    ag.AttentionEconomicsScore, ag.MoodInductionScore, ag.CognitiveResonanceScore,
                    an.SpeechEmotion, an.FocusScore
                FROM meetingCall mc
                LEFT JOIN AudioResults ar ON mc.CallID = ar.CallID
                LEFT JOIN VideoResults vr ON mc.CallID = vr.CallID
                LEFT JOIN AggregatedResults ag ON mc.CallID = ag.CallID
                LEFT JOIN Analytics an ON mc.CallID = an.CallID
                WHERE mc.ClientID = %s
            """, (client_id,))
            call_data = cursor1.fetchall()

            # Second Query: Fetch Analytics and Timestamp Data
            cursor2.execute("""
                SELECT ar.Timestamp, ar.Sentiment, vr.GazeDirection, vr.Emotion,
                    ag.AttentionEconomicsScore, ag.MoodInductionScore, ag.CognitiveResonanceScore
                FROM meetingCall mc
                LEFT JOIN AudioResults ar ON mc.CallID = ar.CallID
                LEFT JOIN VideoResults vr ON mc.CallID = vr.CallID
                LEFT JOIN AggregatedResults ag ON mc.CallID = ag.CallID
                WHERE mc.ClientID = %s
            """, (client_id,))
            analytics_data = cursor2.fetchall()

            cursor1.close()
            cursor2.close()
            conn.close()

            return pd.DataFrame(call_data), pd.DataFrame(analytics_data)

        except mysql.connector.Error as err:
            print(f"Error: {err}")
            return pd.DataFrame(), pd.DataFrame()
        
class CRMApp:
    def __init__(self, root):
        self.root = root
        self.root.title("CRM Dashboard")
        self.root.geometry("1280x720")
        
        self.create_sidebar()
        self.create_main_frame()

    def create_sidebar(self):
        sidebar = tk.Frame(self.root, width=250, bg="#2C3E50")
        sidebar.pack(side="left", fill="y")
        
        buttons = [
            ("Dashboard", self.show_dashboard),
            ("Clients", self.show_clients),
            ("Calls", self.show_calls),
            ("Analytics", self.show_analytics),
            ("Tickets", self.show_tickets),
            ("Create Ticket", self.create_ticket)
        ]

        for text, command in buttons:
            tk.Button(sidebar, text=text, command=command, bg="#3498DB", fg="white").pack(pady=10, fill="x")

    def create_main_frame(self):
        self.main_frame = tk.Frame(self.root, bg="#ECF0F1")
        self.main_frame.pack(side="right", fill="both", expand=True)
        
        self.show_dashboard()

    def show_dashboard(self):
        self.clear_main_frame()
        tk.Label(self.main_frame, text="📊 Dashboard", font=("Arial", 16, "bold"), bg="#ECF0F1").pack()
        
        conn = connect_db()
        if conn:
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT ClientID, Name FROM Client")
            clients = cursor.fetchall()
            conn.close()
            
            tk.Label(self.main_frame, text="Select a Client:", font=("Arial", 12), bg="#ECF0F1").pack(pady=5)
            
            client_var = tk.StringVar()
            client_dropdown = ttk.Combobox(self.main_frame, textvariable=client_var, values=[c["Name"] for c in clients], font=("Arial", 12))
            client_dropdown.pack(pady=5)
            
            def show_client_visualization():
                selected_client = client_var.get()
                client_id = next((c["ClientID"] for c in clients if c["Name"] == selected_client), None)
                if not client_id:
                    messagebox.showerror("Error", "Please select a valid client")
                    return
                self.display_client_visualization(client_id)
            
            tk.Button(self.main_frame, text="Show Visualization", command=show_client_visualization, bg="#27AE60", fg="white").pack(pady=10)

    def display_client_visualization(self, client_id):
        self.clear_main_frame()
        tk.Label(self.main_frame, text="📈 Client Insights", font=("Arial", 16, "bold"), bg="#ECF0F1").pack()

        # ✅ Create Scrollable Frame
        canvas = Canvas(self.main_frame, bg="#ECF0F1")
        scrollbar = ttk.Scrollbar(self.main_frame, orient="vertical", command=canvas.yview)
        scrollable_frame = ttk.Frame(canvas)
        scrollable_frame.bind("<Configure>", lambda e: canvas.configure(scrollregion=canvas.bbox("all")))
        canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)
        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")

        # ✅ Fetch Data
        df_calls, df_analytics = fetch_client_data(client_id)

        if df_calls.empty or df_analytics.empty:
            tk.Label(scrollable_frame, text="No data available for this client", font=("Arial", 12), bg="#ECF0F1").pack()
            return

        # ✅ Process Call Data
        df_calls["StartTime"] = pd.to_datetime(df_calls["StartTime"])
        df_calls.sort_values(by="StartTime", inplace=True)
        df_calls["Interval"] = df_calls["StartTime"].dt.floor("5min").dt.strftime("%H:%M")

        # ✅ Process Analytics Data (Using `Timestamp`)
        df_analytics["Timestamp"] = pd.to_datetime(df_analytics["Timestamp"])
        df_analytics.sort_values(by="Timestamp", inplace=True)
        df_analytics["Interval"] = df_analytics["Timestamp"].dt.floor("5min").dt.strftime("%H:%M")
        print(df_analytics)

        # ✅ Select Numeric Columns
        numeric_columns = ["AttentionEconomicsScore", "MoodInductionScore", "CognitiveResonanceScore"]
        df_grouped_calls = df_calls.groupby("Interval")[numeric_columns].mean().reset_index()
        print(df_grouped_calls)
        df_grouped_analytics = df_analytics.groupby("Interval")[numeric_columns].mean().reset_index()

        # ✅ Create Subplots
        fig, axes = plt.subplots(3, 2, figsize=(14, 15))
        fig.suptitle("Client Analysis", fontsize=16)

        # ✅ Sentiment Distribution
        sns.countplot(x=df_calls["Sentiment"], ax=axes[0, 0], palette="coolwarm")
        axes[0, 0].set_title("Sentiment Distribution")


        # ✅ Engagement Scores Over Time (from Analytics)
        df_grouped_analytics.plot(
            x="Interval",
            y=["AttentionEconomicsScore", "MoodInductionScore", "CognitiveResonanceScore"],
            ax=axes[1, 0],
            title="Engagement Scores Over Time (Analytics)"
        )


        # ✅ Heatmap - Engagement Score Correlations
        sns.heatmap(
            df_calls[["AttentionEconomicsScore", "MoodInductionScore", "CognitiveResonanceScore"]].corr(),
            annot=True, cmap="coolwarm", ax=axes[1, 1]
        )
        axes[1, 1].set_title("Engagement Score Correlations")

        # ✅ Scatter Plot - Cognitive Resonance vs Attention Economics Score
        sns.scatterplot(
            x=df_calls["AttentionEconomicsScore"],
            y=df_calls["CognitiveResonanceScore"],
            ax=axes[2, 0],
            alpha=0.7
        )
        axes[2, 0].set_title("Cognitive Resonance vs Attention Economics Score")

        # ✅ Sentiment Pie Chart
        sentiment_counts = df_calls["Sentiment"].value_counts()
        axes[2, 1].pie(sentiment_counts, labels=sentiment_counts.index, autopct='%1.1f%%', startangle=90, colors=sns.color_palette("pastel"))
        axes[2, 1].set_title("Sentiment Breakdown")

        # ✅ Final Layout Adjustments
        plt.tight_layout(pad=5.0)

        # ✅ Embed Matplotlib Figure in Tkinter
        canvas_fig = FigureCanvasTkAgg(fig, master=scrollable_frame)
        canvas_fig.get_tk_widget().pack()
        canvas_fig.draw()

    def show_clients(self):
        self.clear_main_frame()
        tk.Label(self.main_frame, text="👥 Clients", font=("Arial", 16, "bold"), bg="#ECF0F1").pack()
        self.display_table("SELECT ClientID, Name, UserID FROM Client", ["ClientID", "Name", "UserID"])

    def show_calls(self):
        self.clear_main_frame()
        tk.Label(self.main_frame, text="📞 Calls", font=("Arial", 16, "bold"), bg="#ECF0F1").pack()
        self.display_table("SELECT CallID, StartTime, EndTime, ClientID, UserID FROM meetingCall", ["CallID", "StartTime", "EndTime", "ClientID", "UserID"])
    
   # ✅ Function to Fetch and Display Analytics Data
    def show_analytics(self):
        self.clear_main_frame()
        tk.Label(self.main_frame, text="📈 Analytics Overview", font=("Arial", 16, "bold"), bg="#ECF0F1").pack(pady=10)

        # ✅ Create a scrollable frame for the table
        frame = tk.Frame(self.main_frame, bg="#ECF0F1")
        frame.pack(fill="both", expand=True, padx=20, pady=10)

        # ✅ Define table columns
        columns = ["AnalyticsID", "ClientName", "CallID", "FocusScore", "CognitiveResonanceScore", "SpeechEmotion"]
        tree = ttk.Treeview(frame, columns=columns, show="headings")

        for col in columns:
            tree.heading(col, text=col, command=lambda _col=col: self.sort_table(tree, _col, False))
            tree.column(col, anchor="center", width=180)

        # ✅ Add scrollbar
        scrollbar = ttk.Scrollbar(frame, orient="vertical", command=tree.yview)
        tree.configure(yscrollcommand=scrollbar.set)
        scrollbar.pack(side="right", fill="y")
        tree.pack(fill="both", expand=True)

        # ✅ Fetch Data from Database
        conn = connect_db()
        if conn:
            cursor = conn.cursor(dictionary=True)
            query = """
                SELECT a.AnalyticsID, c.Name AS ClientName, mc.CallID, 
                    a.FocusScore, a.CognitiveResonanceScore, a.SpeechEmotion
                FROM meetingCall mc
                LEFT JOIN Analytics a ON mc.CallID = a.CallID
                LEFT JOIN Client c ON mc.ClientID = c.ClientID
                WHERE a.AnalyticsID IS NOT NULL;
            """
            cursor.execute(query)
            analytics_data = cursor.fetchall()
            cursor.close()
            conn.close()

            print("Fetched Analytics Data:", analytics_data)  # ✅ Debugging output

            if analytics_data:
                # ✅ Insert data into the table
                for row in analytics_data:
                    tree.insert("", "end", values=(
                        row["AnalyticsID"], 
                        row["ClientName"] if row["ClientName"] else "N/A",
                        row["CallID"], 
                        row["FocusScore"] if row["FocusScore"] else "N/A",
                        row["CognitiveResonanceScore"] if row["CognitiveResonanceScore"] else "N/A",
                        row["SpeechEmotion"] if row["SpeechEmotion"] else "N/A"
                    ))
            else:
                tk.Label(frame, text="⚠️ No Analytics Data Found!", fg="red", bg="#ECF0F1", font=("Arial", 12)).pack()
        else:
            tk.Label(frame, text="❌ Database Connection Failed!", fg="red", bg="#ECF0F1", font=("Arial", 12)).pack()
    # ✅ Sorting Function for Table Columns
    def sort_table(self, tree, col, reverse):
        data = [(tree.set(child, col), child) for child in tree.get_children("")]
        data.sort(reverse=reverse)

        for index, (val, child) in enumerate(data):
            tree.move(child, "", index)

        tree.heading(col, command=lambda: self.sort_table(tree, col, not reverse))

    # ✅ Clear the main frame before loading new content
    def clear_main_frame(self):
        for widget in self.main_frame.winfo_children():
            widget.destroy()
    def show_tickets(self):
        self.clear_main_frame()
        tk.Label(self.main_frame, text="🎫 Support Tickets", font=("Arial", 16, "bold"), bg="#ECF0F1").pack()
        self.display_table("SELECT TicketID, ClientID, UserID, Status FROM SupportTickets", ["TicketID", "ClientID", "UserID", "Status"])

    def create_ticket(self):
        new_window = tk.Toplevel(self.root)
        new_window.title("Create Support Ticket")
        new_window.geometry("400x300")
        
        tk.Label(new_window, text="Client ID:").pack()
        client_id_entry = tk.Entry(new_window)
        client_id_entry.pack()
        
        tk.Label(new_window, text="Issue Description:").pack()
        issue_entry = tk.Text(new_window, height=5, width=40)
        issue_entry.pack()
        
        def submit_ticket():
            client_id = client_id_entry.get()
            issue = issue_entry.get("1.0", "end").strip()
            if not client_id or not issue:
                messagebox.showerror("Error", "All fields are required")
                return
            
            conn = connect_db()
            if conn:
                cursor = conn.cursor()
                cursor.execute("INSERT INTO SupportTickets (ClientID, Description, Status) VALUES (%s, %s, 'Open')", (client_id, issue))
                conn.commit()
                cursor.close()
                conn.close()
                messagebox.showinfo("Success", "Ticket Created Successfully!")
                new_window.destroy()
        
        tk.Button(new_window, text="Submit", command=submit_ticket, bg="#27AE60", fg="white").pack(pady=10)

    def clear_main_frame(self):
        for widget in self.main_frame.winfo_children():
            widget.destroy()

    def display_table(self, query, columns):
        conn = connect_db()
        if conn:
            cursor = conn.cursor()
            cursor.execute(query)
            data = cursor.fetchall()
            conn.close()
            
            table = ttk.Treeview(self.main_frame, columns=columns, show="headings")
            for col in columns:
                table.heading(col, text=col)
            
            for row in data:
                table.insert("", "end", values=row)
            
            table.pack(expand=True, fill="both")

if __name__ == "__main__":
    root = tk.Tk()
    app = CRMApp(root)
    root.mainloop()