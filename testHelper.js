(() => {
    // Edit this according to the language you're using the app:
    const CORRECT_ANSWER_STRING = 'Correta'
    const SELECTED_ANSWER_LABEL = 'Resposta Selecionada:'
    const TRYOUT_RESULT_LABEL = 'Resultado da tentativa'

    // No need to edit anything else below this line

    const DB_NAME = 'BlackboardExercises'
    const DB_VERSION = 6
    const STORE_NAME = 'exercises'

    const result = []
    let store
    let percentualScore

    function getIdbRequest() {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION)

        request.onerror = event => {
            console.error('Error opening IndexedDB:', event.target.error)
        }

        request.onupgradeneeded = event => {
            const QUESTION_KEY = 'questionHash'
            const db = event.currentTarget.result

            try {
                db.deleteObjectStore(STORE_NAME)
            } catch (e) {
                console.info('Creating new store')
            } finally {
                const bootstrappedStore = db.createObjectStore(STORE_NAME, { keyPath: QUESTION_KEY })

                bootstrappedStore.createIndex(QUESTION_KEY, QUESTION_KEY)
            }
        }

        return request
    }

    function restoreAnswers(result) {
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

    function saveAnswers() {
        document.querySelectorAll('.label').forEach(el => {
            if (el.innerText.trim() === SELECTED_ANSWER_LABEL) {
                const answer = el.closest('tr').querySelector('.answerTextSpan').innerText.trim()
                const $parentTable = el.closest('table').parentElement.closest('table')
                let allAnswers = Array.from($parentTable.querySelectorAll('.answerTextSpan'))
                    .map(el => el.innerText.trim())
                allAnswers = allAnswers.filter((x, i) => allAnswers.indexOf(x) === i)
                const $answerStatus = $parentTable.querySelector('.reviewTestSubCellForIconBig')
                const answerStatus = $answerStatus.querySelector('img').alt.trim()
                const question = $answerStatus.closest('tr').querySelector('div').innerText.trim()

                const questionHash = calculateQuestionHash(question, allAnswers)

                const tuple = { questionHash, question, answer, answerStatus }
                store.add(tuple)
                result.push(tuple)
            } else if (el.innerText.trim() === TRYOUT_RESULT_LABEL) {
                const score = el.closest('tr').querySelector('td').innerText.trim()
                const [numerator, denominator] = score.replace(/,/g, '.').match(/\d.\d+/g)

                percentualScore = (numerator / denominator * 100).toFixed(2)
            }
        })

        console.log('SCORE %:', percentualScore)
        console.log('RESULT:')
        console.table(result.sort((a, b) => a.question.localeCompare(b.question)))
    }

    function restoreAnswersHandler(event) {
        const db = event.target.result
        // TODO should we move result = [] declaration to here instead (not global)?
        db
            .transaction(STORE_NAME)
            .objectStore(STORE_NAME)
            .openCursor()
            .onsuccess = event => {
                const cursor = event.target.result
                if (cursor) {
                    result.push(cursor.value)
                    cursor.continue()
                } else {
                    console.info('Retrieved all exercises from DB.')
                    restoreAnswers(result)
                }
            }
    }

    function saveAnswersHandler(event) {
        const db = event.target.result

        const transaction = db.transaction([STORE_NAME], 'readwrite')
        transaction.onerror = event => {
            console.error('Error on transaction:', event.target.error)
        }

        store = transaction.objectStore(STORE_NAME)
        const storeReq = store.clear()
        storeReq.onsuccess = saveAnswers
        storeReq.onerror = event => { console.error('Error clearing the store:', event.target.error) }
    }

    function setupIndexedDb() {
        window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB
        window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction || { READ_WRITE: 'readwrite' }
        window.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange
    }

    function calculateQuestionHash(question, allAnswers) {
        allAnswers = allAnswers.sort().join()
        return hashCode(question + allAnswers)
    }

    function hashCode(str) {
        return str
            .split('')
            .reduce((prevHash, currVal) => ((prevHash << 5) - prevHash) + currVal.charCodeAt(0), 0)
    }

    function main() {
        setupIndexedDb()

        const request = getIdbRequest()

        const reviewTestUrlRegex = new RegExp('/assessment/review/')
        const isReviewPage = reviewTestUrlRegex.test(window.location.href)

        // If we're not on test review page, assume we're on the test take page:
        request.onsuccess = isReviewPage ? saveAnswersHandler : restoreAnswersHandler
    }

    // TODO make the code read like a story (main first, then subsequent method declarations)
    main()
})()
