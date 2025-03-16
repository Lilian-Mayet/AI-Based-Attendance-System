import pandas as pd
import matplotlib.pyplot as plt

# Charger les données
df = pd.read_csv("face_recognition_benchmark_detailed.csv")

def plotMatteoVSNonMatteo():
    # Filtrer les données
    df_matteo = df[df["image_type"] == "test_matteo"]
    df_non_matteo = df[df["image_type"] == "non_matteo"]

    # Calculer les moyennes
    matteo_avg = df_matteo.groupby("model")["similarity_score"].mean()
    non_matteo_avg = df_non_matteo.groupby("model")["similarity_score"].mean()

    # Fusionner les résultats
    df_avg = pd.DataFrame({"Matteo": matteo_avg, "Non-Matteo": non_matteo_avg}).reset_index()

  

    # Créer le graphique avec zones colorées

    plt.figure(figsize=(8, 6))

    # Tracer les zones colorées
    x = [0, 1]  # Bornes pour l'axe X
    y = [0, 1]  # Bornes pour l'axe Y
    confusion_margin = 0.15

    # Zone grise (forte confusion) : bande diagonale étroite
    plt.fill_between(x, [y_i - confusion_margin for y_i in y], [y_i + confusion_margin for y_i in y], color='gray', alpha=0.5, label="Confusion")

    # Zone rouge (mauvaise performance) : au-dessus de la diagonale
    plt.fill_between(x, [y_i + confusion_margin for y_i in y], 1.1, color='red', alpha=0.3, label="Mauvais modèle")

    # Zone verte (bonne séparation) : en dessous de la diagonale
    plt.fill_between(x, 0, [y_i - confusion_margin for y_i in y], color='green', alpha=0.3, label="Bon modèle")

    # Tracer les points des modèles
    plt.scatter(df_avg["Matteo"], df_avg["Non-Matteo"], color="blue", alpha=0.7)

    # Annoter chaque point avec le nom du modèle
    for i, row in df_avg.iterrows():
        plt.text(row["Matteo"], row["Non-Matteo"], row["model"], fontsize=9, ha='right')

    # Ajouter des labels et une légende
    plt.xlabel("Moyenne Similarité sur Matteo")
    plt.ylabel("Moyenne Similarité sur Non-Matteo")
    plt.title("Performance des modèles de Face Encoding")
    plt.legend()
    plt.grid(True)

    # Afficher le graphique
    plt.show()


    plt.show()

def plot_encoding_dimensions():
    df_encoding = df.groupby("model")["embedding_length"].mean().reset_index()
    plt.figure(figsize=(8, 6))
    plt.bar(df_encoding["model"], df_encoding["embedding_length"], color="purple")
    plt.xlabel("Modèle")
    plt.ylabel("Dimension de l'encodage")
    plt.title("Dimension des embeddings pour chaque modèle")
    plt.xticks(rotation=45)
    plt.grid(axis='y')
    plt.show()

def plot_computation_time():
    df_time = df.groupby("model")["computation_time"].mean().reset_index()
    plt.figure(figsize=(8, 6))
    plt.bar(df_time["model"], df_time["computation_time"], color="orange")
    plt.xlabel("Modèle")
    plt.ylabel("Temps de calcul moyen (s)")
    plt.title("Temps de calcul moyen par modèle")
    plt.xticks(rotation=45)
    plt.grid(axis='y')
    plt.show()


plotMatteoVSNonMatteo()

plot_computation_time()
plot_encoding_dimensions()