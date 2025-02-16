
from transformers import RobertaTokenizerFast, TFRobertaForSequenceClassification, pipeline

tokenizer = RobertaTokenizerFast.from_pretrained("arpanghoshal/EmoRoBERTa", token= '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')
model = TFRobertaForSequenceClassification.from_pretrained("arpanghoshal/EmoRoBERTa", token= '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')

emotion = pipeline('sentiment-analysis', 
                    model='arpanghoshal/EmoRoBERTa')

emotion_labels = emotion("Thanks for using it.")
print(emotion_labels)
