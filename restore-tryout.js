(() => {
    // Edit this according to the language you're using the app:
    const CORRECT_ANSWER_STRING = 'Correta'

    // No need to edit anything else below this line

    const DB_NAME = 'BlackboardExercises'
    const STORE_NAME = 'exercises'

    const result = []

    function openDb(callback) {
        const request = window.indexedDB.open(DB_NAME, 6)
        request.onerror = event => {
            alert('Error opening IndexedDB:', event.target.errorCode)
        }
        request.onsuccess = event => {
            const db = event.target.result
            db
                .transaction(STORE_NAME)
                .objectStore(STORE_NAME)
                .openCursor()
                .onsuccess = e => {
                    const cursor = e.target.result
                    if (cursor) {
                        result.push(cursor.value);
                        cursor.continue();
                    } else {
                        console.info('Retrieved all exercises from DB.')
                        callback(result)
                    }
                }
        }
    }

    function restoreTryOutAnswers(result) {
        document.querySelectorAll('.takeQuestionDiv').forEach($currentQuestion => {
            const $currentAnswersInputs = $currentQuestion.querySelectorAll('input[type=radio]')
            const currentQuestionTitleText = $currentQuestion.querySelector('fieldset legend').innerText.trim()
            const currentAnswers = Array.from($currentAnswersInputs)
                .map($input => $input.closest('tr').innerText.trim())

            const questionHash = calculateQuestionHash(currentQuestionTitleText, currentAnswers)

            const answeredQuestion = result.find(item => item.questionHash === questionHash)

            if (answeredQuestion && answeredQuestion.answerStatus === CORRECT_ANSWER_STRING) {
                const $correctAnswerRadio = Array.from($currentAnswersInputs).find(candidate => {
                    const $candidateRow = candidate.closest('tr')
                    const candidateAnswer = $candidateRow.querySelector('label').innerText.trim()

                    return  candidateAnswer === answeredQuestion.answer
                })
                $correctAnswerRadio.checked = true
            }
        })

        console.info('All correct answers are now checked.')
    }

    function setupIndexedDb() {
        window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB
        window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction || {READ_WRITE: 'readwrite'}
        window.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange
    }

    function calculateQuestionHash(question, allAnswers) {
        allAnswers = allAnswers.sort().join()
        return hashCode(question + allAnswers)
    }

    function hashCode(str) {
        return str
            .split('')
            .reduce((prevHash, currVal) => ((prevHash << 5) - prevHash) + currVal.charCodeAt(0), 0);
    }

    function main() {
        setupIndexedDb()

        //TODO: Make everything Promises
        openDb(restoreTryOutAnswers)
    }

    main()
})()
