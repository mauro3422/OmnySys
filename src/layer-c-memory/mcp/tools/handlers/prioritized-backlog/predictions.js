export function generatePredictions(recurrenceData) {
    return Object.entries(recurrenceData)
        .filter(([, count]) => count >= 2)
        .map(([key, count]) => {
            const [filePath, issueType] = key.split('::');
            const confidence = Math.min(count * 0.3, 0.9);

            return {
                filePath,
                issueType,
                recurrenceCount: count,
                confidence,
                message: `Predicted: issue likely to recur based on ${count} previous occurrences`,
                type: 'prediction',
                severity: 'low',
                score: confidence
            };
        });
}
