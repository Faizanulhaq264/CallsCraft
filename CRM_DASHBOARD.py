import tkinter as tk
from tkinter import ttk, messagebox, Canvas

import mysql.connector
import bcrypt
import pandas as pd
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
import matplotlib.pyplot as plt
import seaborn as sns
import smtplib
from email.message import EmailMessage
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv(dotenv_path="backend/.env")
current_user_email = None


# Database connection function
def connect_db():
    try:
        return mysql.connector.connect(
            host=os.getenv("DB_HOST"),
            # port=int(os.getenv("DB_PORT")),  # Port must be an integer
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            database=os.getenv("DB_NAME"),
        )
    except mysql.connector.Error as err:
        messagebox.showerror("Database Error", f"Error: {err}")
        return None


# ---------------------------------------------------------------------
#  USER-AUTHENTICATION HELPERS
# ---------------------------------------------------------------------
def ensure_user_table():
    """Create the User table if it doesn't exist (bcrypt-hashed passwords)."""
    conn = connect_db()
    if conn:
        cur = conn.cursor()
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS User (
                UserID   INT AUTO_INCREMENT PRIMARY KEY,
                Name     VARCHAR(255),
                Email    VARCHAR(255) UNIQUE NOT NULL,
                Password VARCHAR(60)  NOT NULL   -- bcrypt hash
            );
        """
        )
        conn.commit()
        cur.close()
        conn.close()


def verify_credentials(email: str, plaintext_pw: str):
    """
    Return (user_id, user_name) if the email / password are correct,
    otherwise return None.
    """
    conn = connect_db()
    if not conn:
        return None
    cur = conn.cursor(dictionary=True)
    cur.execute("SELECT UserID, Name, Password FROM User WHERE Email=%s", (email,))
    row = cur.fetchone()
    cur.close()
    conn.close()
    if not row:
        return None
    stored_hash = row["Password"].encode()
    if bcrypt.checkpw(plaintext_pw.encode(), stored_hash):
        return row["UserID"], (row["Name"] or email), email
    return None


class LoginWindow(tk.Toplevel):
    """Modal login window. Calls on_success(user_id, name) if login passes."""

    def __init__(self, master, on_success):
        super().__init__(master)
        self.title("Login")
        self.geometry("320x180")
        self.configure(bg="#ECF0F1")
        self.on_success = on_success

        tk.Label(self, text="Email:", bg="#ECF0F1").pack(pady=5)
        self.email_entry = tk.Entry(self, width=30)
        self.email_entry.pack()

        tk.Label(self, text="Password:", bg="#ECF0F1").pack(pady=5)
        self.password_entry = tk.Entry(self, width=30, show="*")
        self.password_entry.pack()

        tk.Button(
            self, text="Login", bg="#27AE60", fg="white", command=self.try_login
        ).pack(pady=15)

        self.email_entry.focus_set()

    def try_login(self):
        global current_user_email
        creds = verify_credentials(
            self.email_entry.get().strip(), self.password_entry.get().strip()
        )
        if creds:
            user_id, name, email = creds
            current_user_email = email
            self.destroy()
            self.on_success(user_id, name)
        else:
            messagebox.showerror("Login failed", "Invalid email or password.")


def fetch_client_data(client_id):
    conn = connect_db()

    if not conn:
        print("Error: Could not connect to database.")
        return pd.DataFrame(), pd.DataFrame()

    try:
        cursor1 = conn.cursor(dictionary=True)
        cursor2 = conn.cursor(dictionary=True)

        # First Query: Fetch meetingCall data
        cursor1.execute(
            """
                SELECT mc.CallID, mc.StartTime, mc.EndTime, ar.Sentiment, vr.GazeDirection, vr.Emotion,
                    ag.AttentionEconomicsScore, ag.MoodInductionScore, ag.CognitiveResonanceScore,
                    an.SpeechEmotion, an.FocusScore
                FROM meetingCall mc
                LEFT JOIN AudioResults ar ON mc.CallID = ar.CallID
                LEFT JOIN VideoResults vr ON mc.CallID = vr.CallID
                LEFT JOIN AggregatedResults ag ON mc.CallID = ag.CallID
                LEFT JOIN Analytics an ON mc.CallID = an.CallID
                WHERE mc.ClientID = %s
            """,
            (client_id,),
        )
        call_data = cursor1.fetchall()

        # Second Query: Fetch Analytics and Timestamp Data
        cursor2.execute(
            """
                SELECT ar.Timestamp, ar.Sentiment, vr.GazeDirection, vr.Emotion,
                    ag.AttentionEconomicsScore, ag.MoodInductionScore, ag.CognitiveResonanceScore
                FROM meetingCall mc
                LEFT JOIN AudioResults ar ON mc.CallID = ar.CallID
                LEFT JOIN VideoResults vr ON mc.CallID = vr.CallID
                LEFT JOIN AggregatedResults ag ON mc.CallID = ag.CallID
                WHERE mc.ClientID = %s
            """,
            (client_id,),
        )
        analytics_data = cursor2.fetchall()

        cursor1.close()
        cursor2.close()
        conn.close()

        return pd.DataFrame(call_data), pd.DataFrame(analytics_data)

    except mysql.connector.Error as err:
        print(f"Error: {err}")
        return pd.DataFrame(), pd.DataFrame()


class CRMApp:
    def __init__(self, root, current_user_id, current_user_name):
        self.current_user_id = current_user_id
        self.current_user_name = current_user_name
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
            ("Tickets", self.show_tickets),
            ("Create Ticket", self.create_ticket),
        ]

        for text, command in buttons:
            tk.Button(
                sidebar, text=text, command=command, bg="#3498DB", fg="white"
            ).pack(pady=10, fill="x")

    def create_main_frame(self):
        self.main_frame = tk.Frame(self.root, bg="#ECF0F1")
        self.main_frame.pack(side="right", fill="both", expand=True)

        self.show_dashboard()

    def show_dashboard(self):
        self.clear_main_frame()
        tk.Label(
            self.main_frame,
            text="📊 Dashboard",
            font=("Arial", 16, "bold"),
            bg="#ECF0F1",
        ).pack()

        conn = connect_db()
        if conn:
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT ClientID, Name FROM Client")
            clients = cursor.fetchall()
            conn.close()

            tk.Label(
                self.main_frame,
                text="Select a Client:",
                font=("Arial", 12),
                bg="#ECF0F1",
            ).pack(pady=5)

            client_var = tk.StringVar()
            client_dropdown = ttk.Combobox(
                self.main_frame,
                textvariable=client_var,
                values=[c["Name"] for c in clients],
                font=("Arial", 12),
            )
            client_dropdown.pack(pady=5)

            def show_client_visualization():
                selected_client = client_var.get()
                client_id = next(
                    (c["ClientID"] for c in clients if c["Name"] == selected_client),
                    None,
                )
                if not client_id:
                    messagebox.showerror("Error", "Please select a valid client")
                    return
                self.display_client_visualization(client_id)

            tk.Button(
                self.main_frame,
                text="Show Visualization",
                command=show_client_visualization,
                bg="#27AE60",
                fg="white",
            ).pack(pady=10)

    def display_client_visualization(self, client_id):
        # -------- UI scaffolding (unchanged) --------
        self.clear_main_frame()
        tk.Label(
            self.main_frame,
            text="📈 Client Insights",
            font=("Arial", 16, "bold"),
            bg="#ECF0F1",
        ).pack()

        canvas = Canvas(self.main_frame, bg="#ECF0F1")
        scrollbar = ttk.Scrollbar(
            self.main_frame, orient="vertical", command=canvas.yview
        )
        scrollable = ttk.Frame(canvas)
        scrollable.bind(
            "<Configure>", lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )
        canvas.create_window((0, 0), window=scrollable, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)
        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")

        # -------- Fetch data --------
        df_calls, df_analytics = fetch_client_data(client_id)
        if df_calls.empty or df_analytics.empty:
            tk.Label(
                scrollable,
                text="No data available for this client",
                font=("Arial", 12),
                bg="#ECF0F1",
            ).pack()
            return

        # -------- Pre-processing --------
        df_calls["StartTime"] = pd.to_datetime(df_calls["StartTime"])
        df_calls["CallDuration"] = (
            pd.to_datetime(df_calls["EndTime"]) - df_calls["StartTime"]
        ).dt.total_seconds() / 60  # minutes
        df_calls["Interval"] = (
            df_calls["StartTime"].dt.floor("5min").dt.strftime("%H:%M")
        )

        if "Timestamp" in df_analytics.columns:
            df_analytics["Timestamp"] = pd.to_datetime(df_analytics["Timestamp"])
            df_analytics["Interval"] = (
                df_analytics["Timestamp"].dt.floor("5min").dt.strftime("%H:%M")
            )

        metrics = [
            "AttentionEconomicsScore",
            "MoodInductionScore",
            "CognitiveResonanceScore",
        ]
        df_grouped = df_analytics.groupby("Interval")[metrics].mean().reset_index()

        # -------- Figure & axes --------
        fig, axes = plt.subplots(4, 2, figsize=(16, 20))
        fig.suptitle("Client Analysis Dashboard", fontsize=18)

        # 1️⃣ Sentiment distribution
        sns.countplot(x="Sentiment", data=df_calls, palette="coolwarm", ax=axes[0, 0])
        axes[0, 0].set_title("Sentiment Distribution")

        # 2️⃣ Call-duration distribution
        sns.histplot(df_calls["CallDuration"], kde=True, ax=axes[0, 1])
        axes[0, 1].set_title("Call Duration (minutes)")

        # 3️⃣ Engagement score trends
        if not df_grouped.empty:
            df_grouped.set_index("Interval")[metrics].plot(ax=axes[1, 0], marker="o")
            axes[1, 0].set_title("Engagement Scores Over Time")
            axes[1, 0].set_xlabel("5-min Interval")

        # 4️⃣ Heat-map of score correlations
        sns.heatmap(
            df_calls[metrics].corr(), annot=True, cmap="coolwarm", ax=axes[1, 1]
        )
        axes[1, 1].set_title("Score Correlations")

        # 5️⃣ Cognitive vs Attention scatter
        sns.scatterplot(
            x="AttentionEconomicsScore",
            y="CognitiveResonanceScore",
            data=df_calls,
            alpha=0.7,
            ax=axes[2, 0],
        )
        axes[2, 0].set_title("Cognitive vs Attention Economics")

        # 6️⃣ Gaze-direction share
        if "GazeDirection" in df_calls.columns:
            gaze_counts = df_calls["GazeDirection"].value_counts()
            axes[2, 1].pie(
                gaze_counts,
                labels=gaze_counts.index,
                autopct="%1.1f%%",
                startangle=90,
                colors=sns.color_palette("pastel"),
            )
            axes[2, 1].set_title("Gaze Direction Breakdown")
        else:
            axes[2, 1].axis("off")

        # 7️⃣ Top-5 emotions bar
        if "Emotion" in df_calls.columns:
            top_emotions = (
                df_calls["Emotion"].value_counts().head(5).sort_values(ascending=True)
            )
            top_emotions.plot.barh(ax=axes[3, 0], color="skyblue")
            axes[3, 0].set_title("Top 5 Detected Emotions")
            axes[3, 0].set_xlabel("Occurrences")
        else:
            axes[3, 0].axis("off")

        # 8️⃣ Focus-score histogram
        if "FocusScore" in df_calls.columns:
            sns.histplot(df_calls["FocusScore"], kde=True, ax=axes[3, 1])
            axes[3, 1].set_title("Focus Score Distribution")
        else:
            axes[3, 1].axis("off")

        plt.tight_layout(rect=[0, 0, 1, 0.97], h_pad=3)

        # Embed in Tk
        chart = FigureCanvasTkAgg(fig, master=scrollable)
        chart.get_tk_widget().pack()
        chart.draw()

    def show_clients(self):
        self.clear_main_frame()
        tk.Label(
            self.main_frame, text="👥 Clients", font=("Arial", 16, "bold"), bg="#ECF0F1"
        ).pack()
        self.display_table(
            "SELECT ClientID, Name, UserID FROM Client", ["ClientID", "Name", "UserID"]
        )

    def show_calls(self):
        self.clear_main_frame()
        tk.Label(
            self.main_frame, text="📞 Calls", font=("Arial", 16, "bold"), bg="#ECF0F1"
        ).pack()
        self.display_table(
            "SELECT CallID, StartTime, EndTime, ClientID, UserID FROM meetingCall",
            ["CallID", "StartTime", "EndTime", "ClientID", "UserID"],
        )

    # ✅ Function to Fetch and Display Analytics Data

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
        tk.Label(
            self.main_frame,
            text="🎫 Support Tickets",
            font=("Arial", 16, "bold"),
            bg="#ECF0F1",
        ).pack(pady=10)

        self.display_table(
            "SELECT TicketID, ClientID, UserID, Status FROM SupportTickets",
            ["TicketID", "ClientID", "UserID", "Status"],
        )

    def create_ticket(self):
        def ensure_table():
            """Ensure the SupportTickets table exists."""
            conn = connect_db()
            if conn:
                try:
                    cursor = conn.cursor()
                    cursor.execute(
                        """
                        CREATE TABLE IF NOT EXISTS SupportTickets (
                            TicketID INT AUTO_INCREMENT PRIMARY KEY,
                            ClientID INT NOT NULL,
                            UserID INT,
                            Description TEXT NOT NULL,
                            Status VARCHAR(50) DEFAULT 'Open',
                            CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            FOREIGN KEY (ClientID) REFERENCES Client(ClientID)
                        );
                    """
                    )
                    conn.commit()
                    cursor.close()
                    conn.close()
                except mysql.connector.Error as err:
                    messagebox.showerror(
                        "Database Error", f"Could not create table:\n{err}"
                    )

        ensure_table()

        new_window = tk.Toplevel(self.root)
        new_window.title("Create Support Ticket")
        new_window.geometry("400x300")
        new_window.configure(bg="#ECF0F1")

        # Client ID input
        tk.Label(new_window, text="Client ID:", bg="#ECF0F1").pack(pady=5)
        client_id_entry = tk.Entry(new_window)
        client_id_entry.pack()

        # Issue Description input
        tk.Label(new_window, text="Issue Description:", bg="#ECF0F1").pack(pady=5)
        issue_entry = tk.Text(new_window, height=5, width=40)
        issue_entry.pack()

        def submit_ticket():
            client_id = client_id_entry.get().strip()
            issue = issue_entry.get("1.0", "end").strip()

            if not client_id or not issue:
                messagebox.showerror("Error", "All fields are required.")
                return

            if not client_id.isdigit():
                messagebox.showerror("Error", "Client ID must be a number.")
                return

            try:
                conn = connect_db()
                if conn:
                    cursor = conn.cursor()

                    # Insert ticket into database
                    cursor.execute(
                        """
                        INSERT INTO SupportTickets (ClientID, Description, Status)
                        VALUES (%s, %s, 'Open')
                    """,
                        (int(client_id), issue),
                    )
                    conn.commit()

                    # Fetch the auto-generated TicketID and CreatedAt
                    ticket_id = cursor.lastrowid
                    cursor.execute(
                        "SELECT CreatedAt FROM SupportTickets WHERE TicketID = %s",
                        (ticket_id,),
                    )
                    created_at = cursor.fetchone()[0]

                    cursor.close()
                    conn.close()

                    # Compose email
                    msg = EmailMessage()
                    msg["Subject"] = f"🛠️ New Support Ticket #{ticket_id}"
                    msg["From"] = "i211771@nu.edu.pk"  # Replace with your email
                    msg["To"] = "i211771@nu.edu.pk"

                    msg.set_content(
                        f"""\
        A new support ticket has been created:

        📄 Ticket ID: {ticket_id}
        🧑 Client ID: {client_id}
        📧 Submitted By: {current_user_email}
        🕒 Created At: {created_at.strftime('%Y-%m-%d %H:%M:%S')}
        📝 Description:
        {issue}

        Status: Open
        """
                    )

                    # Send email
                    with smtplib.SMTP_SSL(
                        "smtp.gmail.com", 465
                    ) as smtp:  # Change SMTP for other providers
                        smtp.login(
                            "i211771@nu.edu.pk", "vgsi fwro eoxj qolm"
                        )  # Use App Password here
                        smtp.send_message(msg)

                    messagebox.showinfo("Success", "Ticket Created and Email Sent!")
                    new_window.destroy()

            except mysql.connector.Error as err:
                messagebox.showerror("Database Error", f"Error creating ticket:\n{err}")
            except Exception as e:
                messagebox.showerror("Email Error", f"Failed to send email:\n{e}")

        tk.Button(
            new_window, text="Submit", command=submit_ticket, bg="#27AE60", fg="white"
        ).pack(pady=15)

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
    ensure_user_table()  # make sure the User table exists

    root = tk.Tk()
    root.withdraw()  # hide main window until login succeeds

    def start_dashboard(user_id, name):
        root.deiconify()  # show the main window
        CRMApp(root, user_id, name)

    # Pop the login dialog (blocks until closed)
    LoginWindow(root, on_success=start_dashboard)
    root.mainloop()
