(() => {
    // Edit this according to the language you're using the app:
    const SELECTED_ANSWER_LABEL = 'Resposta Selecionada:'
    const TRYOUT_RESULT_LABEL = 'Resultado da tentativa'

    // No need to edit anything else below this line

    const DB_NAME = 'BlackboardExercises'
    const STORE_NAME = 'exercises'

    let store
    let percentualScore
    const result = []

    function openDb(callback) {
        const request = window.indexedDB.open(DB_NAME, 6)
        request.onerror = event => { console.error('Error opening IndexedDB:', event.target.error) }
        request.onsuccess = event => {
            const db = event.target.result

            const transaction = db.transaction([STORE_NAME], 'readwrite')
            transaction.onerror = event => {
                console.error('Error on transaction:', event.target.error)
            }
            store = transaction.objectStore(STORE_NAME)
            const storeReq = store.clear()
            storeReq.onsuccess = callback
            storeReq.onerror = event => { console.error('Error clearing the store:', event.target.error) }
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
    }

    function saveTryOutAnswers() {
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
        openDb(saveTryOutAnswers)
    }

    main()
})()
