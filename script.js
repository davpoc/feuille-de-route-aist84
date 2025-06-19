let slideIndex = 0;
showSlides(slideIndex);

function plusSlides(n) {
    showSlides(slideIndex += n);
}

function currentSlide(n) {
    showSlides(slideIndex = n);
}

function showSlides(n) {
    let i;
    let slides = document.getElementsByClassName("slide");
    if (n >= slides.length) { slideIndex = 0 }
    if (n < 0) { slideIndex = slides.length - 1 }
    
    for (i = 0; i < slides.length; i++) {
        slides[i].classList.remove("active");
        slides[i].style.display = "none";
    }
    
    slides[slideIndex].style.display = "flex";
    slides[slideIndex].classList.add("active");
}

const saveNameInput = document.getElementById('saveName');
const savedSessionsList = document.getElementById('savedSessionsList');
const STORAGE_PREFIX = 'feuilleDeRoute_AIST84_V7_'; // Updated version prefix

const ACTION_PLACEHOLDER_TEMPLATE = "Quoi : \nQui : \nQuand : \nIndicateurs : ";

// Function to add a new textarea to a container
function addTextField(containerId, baseFieldId, initialValue = '', isActionField = false) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const wrapper = document.createElement('div'); 
    wrapper.classList.add('textarea-wrapper');

    const newTextArea = document.createElement('textarea');
    newTextArea.dataset.field = baseFieldId;
    
    if (isActionField) {
        const actionNumber = container.querySelectorAll('.textarea-wrapper').length + 1;
        newTextArea.placeholder = `Action ${actionNumber}:\n${ACTION_PLACEHOLDER_TEMPLATE}`;
        if (initialValue === '' && actionNumber > 1) { // Only add prefix if value is empty and not the first action
             // Value will be set by applyData or kept empty for user to fill
        } else if (initialValue === '') { // First action field (template) or new empty field
            // Placeholder already set
        }
    } else {
        newTextArea.placeholder = container.querySelector('.textarea-wrapper textarea')?.placeholder || `Nouveau champ pour ${baseFieldId}`;
    }
    newTextArea.value = initialValue; // Set value after placeholder logic
    
    wrapper.appendChild(newTextArea);

    const removeBtn = document.createElement('button');
    removeBtn.classList.add('remove-field-btn');
    const removeIcon = document.createElement('span'); 
    removeIcon.classList.add('material-icons');
    removeIcon.textContent = 'close'; 
    removeBtn.appendChild(removeIcon);
    removeBtn.title = "Supprimer ce champ";

    removeBtn.onclick = function() { 
        if (newTextArea.value.trim() !== '' && !confirm("Supprimer ce champ et son contenu ?")) {
            return;
        }
        wrapper.remove();
        // Re-number actions if it's an action field
        if (isActionField) {
            renumberActions(containerId);
        }
    };
    
    wrapper.appendChild(removeBtn);
    container.appendChild(wrapper);
}

function renumberActions(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const actionTextareas = container.querySelectorAll('.textarea-wrapper textarea[data-field="actions_prioritaires"]');
    actionTextareas.forEach((textarea, index) => {
        const actionNumber = index + 1;
        // Only update placeholder if it's the default structure. User's actual text is more important.
        // We might want to adjust this logic if users expect numbering to be part of the actual value.
        // For now, placeholder is just a guide.
        textarea.placeholder = `Action ${actionNumber}:\n${ACTION_PLACEHOLDER_TEMPLATE}`;
    });
}


function collectData() {
    const data = {};
    const containers = document.querySelectorAll('.dynamic-textarea-container');
    
    containers.forEach(container => {
        const textareas = container.querySelectorAll('.textarea-wrapper textarea'); 
        if (textareas.length > 0) {
            const baseFieldId = textareas[0].dataset.field; 
            data[baseFieldId] = []; 
            textareas.forEach(textarea => {
                data[baseFieldId].push(textarea.value);
            });
        }
    });
    return data;
}

function applyData(dataObject) {
    const containers = document.querySelectorAll('.dynamic-textarea-container');
    containers.forEach(container => {
        const existingWrappers = container.querySelectorAll('.textarea-wrapper');
        const baseFieldId = existingWrappers.length > 0 ? existingWrappers[0].querySelector('textarea').dataset.field : container.id.replace('_container',''); // Fallback for empty init

        existingWrappers.forEach(wrapper => wrapper.remove());
        
        if (baseFieldId) {
            const dataForField = dataObject[baseFieldId];
            const isAction = baseFieldId === 'actions_prioritaires';

            if (dataForField && Array.isArray(dataForField) && dataForField.length > 0) {
                dataForField.forEach((value) => { // Removed index here as addTextField will handle numbering
                    addTextField(container.id, baseFieldId, value, isAction);
                });
            } else {
                 addTextField(container.id, baseFieldId, '', isAction); // Add one empty field
            }
            if(isAction) renumberActions(container.id); // Ensure numbering is correct after loading
        }
    });
}


function saveData() {
    const sessionName = saveNameInput.value.trim();
    if (!sessionName) {
        alert("Veuillez donner un nom à votre session de travail.");
        return;
    }

    const currentData = collectData();
    try {
        localStorage.setItem(STORAGE_PREFIX + sessionName, JSON.stringify(currentData));
        alert(`Session "${sessionName}" sauvegardée !`);
        saveNameInput.value = sessionName;
        displaySavedSessions();
    } catch (e) {
        console.error("Erreur lors de la sauvegarde : ", e);
        alert("Erreur lors de la sauvegarde. Le stockage local est peut-être plein ou une erreur s'est produite.");
    }
}

function loadSession(sessionName) {
    const savedDataString = localStorage.getItem(STORAGE_PREFIX + sessionName);
    if (savedDataString) {
        try {
            const savedDataObject = JSON.parse(savedDataString);
            applyData(savedDataObject); 
            saveNameInput.value = sessionName;
            alert(`Session "${sessionName}" chargée.`);
        } catch (e) {
            alert("Erreur lors du chargement des données de la session.");
            console.error("Erreur de parsing JSON : ", e);
        }
    } else {
        alert("Aucune donnée trouvée pour cette session.");
    }
}

function deleteSession(sessionName) {
    if (confirm(`Êtes-vous sûr de vouloir supprimer la session "${sessionName}" ?`)) {
        localStorage.removeItem(STORAGE_PREFIX + sessionName);
        alert(`Session "${sessionName}" supprimée.`);
        if(saveNameInput.value === sessionName) {
            saveNameInput.value = '';
            applyData({}); 
        }
        displaySavedSessions();
    }
}

function displaySavedSessions() {
    savedSessionsList.innerHTML = '';
    let hasSessions = false;
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_PREFIX)) {
            hasSessions = true;
            const sessionName = key.substring(STORAGE_PREFIX.length);
            const listItem = document.createElement('li');
            
            const nameSpan = document.createElement('span');
            nameSpan.textContent = sessionName;
            listItem.appendChild(nameSpan);

            const buttonsDiv = document.createElement('div');
            
            const loadButton = document.createElement('button');
            loadButton.textContent = 'Charger';
            loadButton.classList.add('load-btn');
            loadButton.onclick = (function(name) { return function() { loadSession(name); }; })(sessionName);
            buttonsDiv.appendChild(loadButton);

            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Supprimer';
            deleteButton.classList.add('delete-btn');
            deleteButton.onclick = (function(name) { return function() { deleteSession(name); }; })(sessionName);
            buttonsDiv.appendChild(deleteButton);

            listItem.appendChild(buttonsDiv);
            savedSessionsList.appendChild(listItem);
        }
    }
    if (!hasSessions) {
        savedSessionsList.innerHTML = '<li>Aucune session sauvegardée.</li>';
    }
}

function exportToJson() {
    const sessionNameForExport = saveNameInput.value.trim();
    const currentData = collectData();

    let hasActualData = false;
    for (const key in currentData) {
        if (Array.isArray(currentData[key])) {
            if (currentData[key].some(val => val.trim() !== '')) {
                hasActualData = true;
                break;
            }
        }
    }

    if (hasActualData) {
        const dataStr = JSON.stringify(currentData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `${sessionNameForExport || "FeuilleDeRoute_AIST84"}.json`;
        
        let linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.style.display = 'none';
        document.body.appendChild(linkElement);
        linkElement.click();
        document.body.removeChild(linkElement);
    } else {
        alert("Aucune donnée saisie à exporter. Veuillez remplir au moins un champ ou charger une session avec du contenu.");
    }
}

function importFromJson(event) {
    const file = event.target.files[0];
    if (!file) { return; }
    if (file.type !== "application/json") {
        alert("Veuillez sélectionner un fichier .json valide.");
        event.target.value = null; return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            applyData(importedData); 
            let suggestedName = file.name.replace(/\.json$/i, '').replace(/_/g, ' ');
            saveNameInput.value = suggestedName;
            alert(`Données importées depuis "${file.name}". N'oubliez pas de sauvegarder la session sous un nom si vous souhaitez la conserver dans le navigateur.`);
        } catch (error) {
            alert("Erreur lors de la lecture ou du traitement du fichier JSON. Assurez-vous que le format est correct.");
            console.error("Erreur d'importation JSON :", error);
        }
    };
    reader.onerror = function() {
        alert("Erreur lors de la lecture du fichier.");
        console.error("Erreur FileReader:", reader.error);
    };
    reader.readAsText(file);
    event.target.value = null;
}

window.onload = function() {
    displaySavedSessions();
    const initialData = {};
    document.querySelectorAll('.dynamic-textarea-container').forEach(container => {
        const firstTextareaWrapper = container.querySelector('.textarea-wrapper');
        const firstTextarea = firstTextareaWrapper ? firstTextareaWrapper.querySelector('textarea') : null;
        
        if (firstTextarea) {
            const baseFieldId = firstTextarea.dataset.field;
            const isAction = baseFieldId === 'actions_prioritaires';
            let placeholderValue = firstTextarea.placeholder;
            if (isAction && !placeholderValue.startsWith("Action 1:")) { // Set initial placeholder for action
                placeholderValue = `Action 1:\n${ACTION_PLACEHOLDER_TEMPLATE}`;
                firstTextarea.placeholder = placeholderValue;
            }
            initialData[baseFieldId] = [firstTextarea.value || ''];
        } else { 
            const baseFieldIdFromContainer = container.id.replace('_container', '');
             if(baseFieldIdFromContainer) {
                const isAction = baseFieldIdFromContainer === 'actions_prioritaires';
                initialData[baseFieldIdFromContainer] = ['']; // Will be populated by addTextField in applyData
                 // applyData will handle setting the correct placeholder for actions
             }
        }
    });
    applyData(initialData); 
};