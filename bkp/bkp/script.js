window.nextTaskNumber = 1; 

document.addEventListener('DOMContentLoaded', () => {
    let popupAutoHideTimeout = null;
    let currentFilterCategory = "All";
    let currentTaskImageAsDataURL = null; 

    const taskNameInput = document.getElementById('taskName');
    const taskDifficultySelect = document.getElementById('taskDifficulty');
    const addTaskBtn = document.getElementById('addTaskBtn');
    const taskListUl = document.getElementById('taskList');

    var tasks = [];
    const baseDifficultySettings = { 
        VeryEasy: { xp: 5, gold: 2, hpPenalty: 3 }, Easy: { xp: 10, gold: 5, hpPenalty: 5 }, Normal: { xp: 15, gold: 7, hpPenalty: 8 },
        Medium: { xp: 25, gold: 10, hpPenalty: 12 }, Hard: { xp: 50, gold: 20, hpPenalty: 20 }, Challenging: { xp: 75, gold: 35, hpPenalty: 30 },
        Legendary: { xp: 150, gold: 75, hpPenalty: 50 }
    };
    var difficultySettings = {};
    for (const key in baseDifficultySettings) {
        difficultySettings[key] = {
            xp: Math.round(baseDifficultySettings[key].xp * 1.25),
            gold: baseDifficultySettings[key].gold,
            hpPenalty: baseDifficultySettings[key].hpPenalty
        };
    }

    let player = {
        level: 1, currentXP: 0, xpToNextLevel: 100, gold: 0,
        strength: 5, dexterity: 5, vitality: 5, intelligence: 5, wisdom: 5, charisma: 5,
        maxHP: 50, currentHP: 50
    };
    const initialPlayerState = JSON.parse(JSON.stringify(player));

    const taskCategories = ["General", "Combat", "Crafting", "Exploration", "Social", "Chores", "Study", "Errands", "Magic", "Stealth", "Fitness"];
    const taskIcons = ["📝", "⚔️", "🛠️", "🗺️", "💬", "🧹", "🧠", "🏃‍♂️", "✨", "🤫", "💪", "❤️", "💰", "🎯", "🛡️", "🧪", "📜", "🔑", "🌲", "🏠", "❓"];
    const xpLevels = [0, 100, 250, 500, 800, 1200, 1700, 2300, 3000, 3800, 4700, 5700, 6800, 8000, 9300, 10700];

    const playerLevelDisplay = document.getElementById('playerLevel');
    const playerXPDisplay = document.getElementById('playerXP');
    const xpToNextLevelDisplay = document.getElementById('xpToNextLevel');
    const xpBarFill = document.getElementById('xpBarFill');
    const playerGoldDisplay = document.getElementById('playerGold');
    const playerCurrentHPDisplay = document.getElementById('playerCurrentHP');
    const playerMaxHPDisplay = document.getElementById('playerMaxHP');
    const hpBarFill = document.getElementById('hpBarFill');
    const levelUpNotification = document.getElementById('levelUpNotification');
    const taskNameColorInput = document.getElementById('taskNameColor');
    const taskStatTypeSelect = document.getElementById('taskStatType');
    const taskCategorySelect = document.getElementById('taskCategory');
    const taskIconSelect = document.getElementById('taskIcon');
    const filterCategorySelect = document.getElementById('filterCategory');
    const taskImageUploadInput = document.getElementById('taskImageUpload');
    const taskImagePreview = document.getElementById('taskImagePreview');
    const taskBonusToggle = document.getElementById('taskBonusToggle');
    const isNegativeTaskToggle = document.getElementById('isNegativeTask');
    
    const taskCompletePopup = document.getElementById('taskCompletePopup');
    const popupTaskName = document.getElementById('popupTaskName');
    const popupRewards = document.getElementById('popupRewards');
    const resetGameBtn = document.getElementById('resetGameBtn');

    // New page elements
    const statsPage = document.getElementById('statsPage');
    const tasksPage = document.getElementById('tasksPage');
    const viewTasksBtn = document.getElementById('viewTasksBtn');
    const backToStatsBtn = document.getElementById('backToStatsBtn');

    const attributeElements = {
        strength: { display: document.getElementById('playerStrengthVal'), bar: document.getElementById('strengthStatBar') },
        dexterity: { display: document.getElementById('playerDexterityVal'), bar: document.getElementById('dexterityStatBar') },
        vitality: { display: document.getElementById('playerVitalityVal'), bar: document.getElementById('vitalityStatBar') },
        intelligence: { display: document.getElementById('playerIntelligenceVal'), bar: document.getElementById('intelligenceStatBar') },
        wisdom: { display: document.getElementById('playerWisdomVal'), bar: document.getElementById('wisdomStatBar') },
        charisma: { display: document.getElementById('playerCharismaVal'), bar: document.getElementById('charismaStatBar') }
    };
    const MAX_STAT_VALUE = 100;

    function calculateMaxHP() { return 50 + (player.vitality * 10); }

    loadGameData();
    populateDropdowns();

    taskImageUploadInput.addEventListener('change', function () {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                taskImagePreview.src = e.target.result;
                taskImagePreview.classList.remove('hidden');
                currentTaskImageAsDataURL = e.target.result;
            }
            reader.readAsDataURL(file);
        } else {
            taskImagePreview.classList.add('hidden');
            taskImagePreview.src = "#";
            currentTaskImageAsDataURL = null;
        }
    });

    function populateDropdowns() {
        taskCategorySelect.innerHTML = ''; taskIconSelect.innerHTML = ''; filterCategorySelect.innerHTML = ''; taskDifficultySelect.innerHTML = ''; taskStatTypeSelect.innerHTML = '';
        taskCategories.forEach(category => { const option = document.createElement('option'); option.value = category; option.textContent = category; taskCategorySelect.appendChild(option); });
        taskIcons.forEach(icon => { const option = document.createElement('option'); option.value = icon; option.textContent = icon; taskIconSelect.appendChild(option); });
        if (taskIcons.length > 0) taskIconSelect.value = taskIcons[taskIcons.length - 1];
        const allOption = document.createElement('option'); allOption.value = "All"; allOption.textContent = "All Categories"; filterCategorySelect.appendChild(allOption);
        taskCategories.forEach(category => { const option = document.createElement('option'); option.value = category; option.textContent = category; filterCategorySelect.appendChild(option); });
        Object.keys(difficultySettings).forEach(difficultyKey => { let option = document.createElement('option'); option.value = difficultyKey; option.textContent = difficultyKey.replace(/([A-Z])/g, ' $1').trim(); if (difficultyKey === "Easy") option.selected = true; taskDifficultySelect.appendChild(option); });
        const statOptions = [{ value: "strength", text: "💪 Strength" }, { value: "dexterity", text: "🤸 Dexterity" }, { value: "vitality", text: "❤️ Vitality" }, { value: "intelligence", text: "🧠 Intelligence" }, { value: "wisdom", text: "🦉 Wisdom" }, { value: "charisma", text: "✨ Charisma" }, { value: "none", text: "➖ None", selected: true }];
        statOptions.forEach(statOpt => { let option = document.createElement('option'); option.value = statOpt.value; option.textContent = statOpt.text; if (statOpt.selected) option.selected = true; taskStatTypeSelect.appendChild(option); });
    }

    addTaskBtn.addEventListener('click', () => {
        const name = taskNameInput.value.trim();
        const difficulty = taskDifficultySelect.value;
        const nameColor = taskNameColorInput.value;
        const associatedStat = taskStatTypeSelect.value;
        const category = taskCategorySelect.value;
        const icon = taskIconSelect.value;
        const isBonus = taskBonusToggle.checked;
        const isNegative = isNegativeTaskToggle.checked;

        if (name === "") { alert("Please enter a task name."); return; }
        console.log("[addTaskBtn] Adding task. Difficulty selected:", difficulty);
        
        const rewards = difficultySettings[difficulty];
        console.log("[addTaskBtn] Rewards object for this difficulty:", rewards);

        if (!rewards || rewards.xp === undefined || rewards.gold === undefined || rewards.hpPenalty === undefined) {
            console.error("[addTaskBtn] Error: Rewards object is invalid for difficulty level:", difficulty, rewards);
            alert("Error: Invalid difficulty level or rewards data corrupted. Please check console.");
            return;
        }

        const newTask = {
            id: Date.now().toString(), number: window.nextTaskNumber++, name, difficulty,
            xp: rewards.xp, gold: rewards.gold, hpPenalty: rewards.hpPenalty,
            nameColor, associatedStat, category, icon, customImage: currentTaskImageAsDataURL,
            isBonus, isNegative, completed: false, timesCompleted: 0
        };
        tasks.push(newTask);
        currentTaskImageAsDataURL = null;
        taskImagePreview.classList.add('hidden'); taskImagePreview.src = "#";
        taskImageUploadInput.value = "";
        taskBonusToggle.checked = false;
        isNegativeTaskToggle.checked = false;

        console.log("[addTaskBtn] New task object created:", newTask);
        
        console.log("[addTaskBtn] Attempting to call renderGame()...");
        try {
            renderGame();
            console.log("[addTaskBtn] renderGame() call completed.");
        } catch (e) {
            console.error("[addTaskBtn] Error during renderGame():", e);
        }
        
        console.log("[addTaskBtn] Attempting to call saveGameData()...");
        try {
            saveGameData(); // Restored full function
            console.log("[addTaskBtn] saveGameData() call completed.");
        } catch (e) {
            console.error("[addTaskBtn] Error during saveGameData():", e);
        }
        
        console.log("[addTaskBtn] Task addition process complete in listener.");
        taskNameInput.value = "";
    });

    function hideCompletionPopup() {
        console.log("[hideCompletionPopup] Called.");
        if (!taskCompletePopup.classList.contains('hidden')) {
            taskCompletePopup.classList.add('animate-out');
            setTimeout(() => {
                taskCompletePopup.classList.add('hidden');
                taskCompletePopup.classList.remove('animate-out', 'animate-in'); 
            }, 400); 
        }
    }
    
    function updatePlayerStatsDisplay() {
        console.log("[updatePlayerStatsDisplay] Called.");
        playerLevelDisplay.textContent = player.level;
        playerXPDisplay.textContent = player.currentXP;
        playerGoldDisplay.textContent = player.gold;
        player.maxHP = calculateMaxHP(); 
        playerCurrentHPDisplay.textContent = player.currentHP;
        playerMaxHPDisplay.textContent = player.maxHP;
        const hpPercentage = player.maxHP > 0 ? (player.currentHP / player.maxHP) * 100 : 0;
        if(hpBarFill) hpBarFill.style.width = `${Math.max(0, Math.min(hpPercentage, 100))}%`;
        for (const stat in attributeElements) {
            if (player.hasOwnProperty(stat) && attributeElements.hasOwnProperty(stat) && attributeElements[stat].display) {
                attributeElements[stat].display.textContent = player[stat];
                const statPercentage = (player[stat] / MAX_STAT_VALUE) * 100;
                if (attributeElements[stat].bar) attributeElements[stat].bar.style.width = `${Math.min(statPercentage, 100)}%`;
            }
        }
        if (player.xpToNextLevel === Infinity) {
            xpToNextLevelDisplay.textContent = "MAX"; if(xpBarFill) xpBarFill.style.width = '100%';
        } else {
            xpToNextLevelDisplay.textContent = player.xpToNextLevel;
            const xpPercentage = (player.currentXP / player.xpToNextLevel) * 100;
            if(xpBarFill) xpBarFill.style.width = `${Math.min(xpPercentage, 100)}%`;
        }
        console.log("[updatePlayerStatsDisplay] Finished.");
    }

    function checkLevelUp() { 
        console.log("[checkLevelUp] Called.");
        const xpLevels = [0, 100, 250, 500, 800, 1200, 1700, 2300, 3000, 3800, 4700, 5700, 6800, 8000, 9300, 10700]; 
        const levelUpNotification = document.getElementById('levelUpNotification'); 
        let leveledUp = false;
        while (player.currentXP >= player.xpToNextLevel && player.xpToNextLevel !== Infinity) {
            player.currentXP -= player.xpToNextLevel; 
            player.level++;
            player.xpToNextLevel = (player.level < xpLevels.length) ? xpLevels[player.level] : Infinity;
            leveledUp = true;
            console.log(`Leveled up to ${player.level}! Current XP: ${player.currentXP}. Next level at ${player.xpToNextLevel} XP.`);
        }
        updatePlayerStatsDisplay(); 
        if (leveledUp) {
            levelUpNotification.classList.remove('hidden');
            levelUpNotification.classList.add('animate');
            setTimeout(() => {
                levelUpNotification.classList.add('hidden');
                levelUpNotification.classList.remove('animate');
            }, 2500); 
            console.log("Level up notification triggered!");
            try {
                const levelUpSound = new Audio('lvlup.ogg'); 
                levelUpSound.play().catch(e => console.error("Error playing level up sound:", e));
            } catch (e) { console.error("Could not create or play level up sound:", e); }
        }
        console.log("[checkLevelUp] Finished.");
    }
    
    function renderTasks() {
        console.log("[renderTasks] Called. Current filter:", currentFilterCategory);
        taskListUl.innerHTML = ""; 
        let tasksToRender = (currentFilterCategory === "All") ? tasks : tasks.filter(task => task.category === currentFilterCategory);
        console.log("[renderTasks] Tasks to render after filter:", tasksToRender.length);

        const sortedTasksToRender = [...tasksToRender].sort((a,b) => a.number - b.number); // Corrected variable name

        if (sortedTasksToRender.length === 0) { 
            const li = document.createElement('li');
            if (tasks.length === 0) { 
                 li.textContent = "No tasks available. Add some!";
            } else { 
                 li.textContent = `No tasks found in category: ${currentFilterCategory}`;
            }
            li.classList.add('empty-filter-message'); 
            taskListUl.appendChild(li);
            console.log("[renderTasks] Appended empty message.");
        } else {
            sortedTasksToRender.forEach(task => { 
                console.log("[renderTasks] Creating element for task:", task.name);
                const li = createTaskElement(task);
                taskListUl.appendChild(li);
                console.log("[renderTasks] Appended task item for:", task.name);
            });
        }
        console.log("[renderTasks] Finished.");
    }

    function createTaskElement(task) { 
        console.log("[createTaskElement] Received task:", task ? task.name : "undefined task");
        const li = document.createElement('li');
        li.setAttribute('data-id', task.id);
        if (task.isNegative) { li.classList.add('negative-task-item'); }
        const taskDetailsDiv = document.createElement('div');
        taskDetailsDiv.classList.add('task-details');
        if (task.customImage) { const img = document.createElement('img'); img.src = task.customImage; img.alt = task.name; img.classList.add('task-item-image'); taskDetailsDiv.appendChild(img); } else { const iconSpan = document.createElement('span'); iconSpan.classList.add('task-icon-display'); iconSpan.textContent = task.icon || "❓"; taskDetailsDiv.appendChild(iconSpan); }
        const numberSpan = document.createElement('span'); numberSpan.classList.add('task-number'); numberSpan.textContent = `${task.number}. `; taskDetailsDiv.appendChild(numberSpan);
        const nameSpan = document.createElement('span'); nameSpan.classList.add('task-name'); nameSpan.textContent = task.name; if (task.nameColor) nameSpan.style.color = task.nameColor; taskDetailsDiv.appendChild(nameSpan);
        if (task.isBonus && !task.isNegative) { const bonusIndicator = document.createElement('span'); bonusIndicator.textContent = " ⭐Bonus!"; bonusIndicator.classList.add('bonus-indicator'); nameSpan.appendChild(bonusIndicator); }
        if (task.isNegative) { const penaltyIndicator = document.createElement('span'); penaltyIndicator.textContent = " 💀Penalty!"; penaltyIndicator.classList.add('penalty-indicator'); nameSpan.appendChild(penaltyIndicator); }
        const categorySpan = document.createElement('span'); categorySpan.classList.add('task-category-display'); categorySpan.textContent = `[${task.category || 'General'}]`; taskDetailsDiv.appendChild(categorySpan);
        const rewardsSpan = document.createElement('span'); rewardsSpan.classList.add('task-rewards');
        let currentTaskXp = task.xp; let currentTaskGold = task.gold; let hpEffect = task.hpPenalty;
        if (task.isBonus && !task.isNegative) { currentTaskXp = Math.round(currentTaskXp * 1.20); currentTaskGold = Math.round(currentTaskGold * 1.20); }
        let rewardsText;
        if (task.isNegative) { rewardsText = `(D: ${task.difficulty}, <span class="reward-penalty">XP: -${currentTaskXp}</span>, <span class="reward-penalty">Gold: -${currentTaskGold}</span>, <span class="reward-penalty">HP: -${hpEffect}</span>`; } 
        else { rewardsText = `(D: ${task.difficulty}, <span class="reward-value">XP: ${currentTaskXp}</span>, <span class="reward-value">Gold: ${currentTaskGold}</span>`; }
        if (task.associatedStat && task.associatedStat !== "none" && !task.isNegative) { rewardsText += `, <span class="reward-value stat-reward">Stat: +1 ${task.associatedStat.charAt(0).toUpperCase() + task.associatedStat.slice(1)}</span>`; }
        rewardsText += `)`; rewardsSpan.innerHTML = rewardsText; taskDetailsDiv.appendChild(rewardsSpan);
        li.appendChild(taskDetailsDiv);
        const controlsDiv = document.createElement('div'); controlsDiv.classList.add('task-controls');
        const completionInfoSpan = document.createElement('span'); completionInfoSpan.classList.add('task-completion-info'); completionInfoSpan.textContent = task.isNegative ? `[Penalized: ${task.timesCompleted} times]` : `[Completed: ${task.timesCompleted} times]`; controlsDiv.appendChild(completionInfoSpan);
        const actionBtn = document.createElement('button'); 
        actionBtn.textContent = task.isNegative ? "Accept Penalty" : "Complete";
        actionBtn.classList.add(task.isNegative ? 'penalty-btn' : 'complete-btn'); 
        actionBtn.addEventListener('click', () => completeTask(task.id)); controlsDiv.appendChild(actionBtn);
        const deleteBtn = document.createElement('button'); deleteBtn.textContent = "Delete"; deleteBtn.classList.add('delete-btn'); deleteBtn.addEventListener('click', () => deleteTask(task.id)); controlsDiv.appendChild(deleteBtn);
        li.appendChild(controlsDiv);
        console.log("[createTaskElement] Returning li:", li.outerHTML.substring(0, 100) + "...");
        return li;
    }

    function completeTask(taskId) { 
        console.log("[completeTask] Called for task ID:", taskId);
        const task = tasks.find(t => t.id === taskId); 
        if (task) {
            const taskElement = taskListUl.querySelector(`li[data-id="${taskId}"]`);
            if (taskElement) {
                taskElement.classList.add(task.isNegative ? 'task-penalizing' : 'task-completing'); 
                setTimeout(() => {
                    task.timesCompleted++; 
                    let actualXp = task.xp; let actualGold = task.gold; let hpChange = task.hpPenalty;
                    if (task.isBonus && !task.isNegative) { actualXp = Math.round(actualXp * 1.20); actualGold = Math.round(actualGold * 1.20); }
                    if (task.isNegative) {
                        player.currentXP = Math.max(0, player.currentXP - actualXp); 
                        player.gold = Math.max(0, player.gold - actualGold); 
                        player.currentHP = Math.max(0, player.currentHP - hpChange); 
                        console.log(`Task "${task.name}" Penalty Applied! Lost ${actualXp} XP, ${actualGold} Gold, ${hpChange} HP.`);
                    } else {
                        player.currentXP += actualXp; player.gold += actualGold;
                        if (task.associatedStat && task.associatedStat !== "none" && player.hasOwnProperty(task.associatedStat)) { player[task.associatedStat]++; console.log(`Player ${task.associatedStat} increased to ${player[task.associatedStat]}`); }
                        console.log(`Task "${task.name}" completed! Times: ${task.timesCompleted}. Gained ${actualXp} XP, ${actualGold} Gold.`);
                    }
                    checkLevelUp(); 
                    const counterSpan = taskElement.querySelector('.task-completion-info');
                    if (counterSpan) { counterSpan.classList.add('animate-counter'); counterSpan.textContent = task.isNegative ? `[Penalized: ${task.timesCompleted} times]` : `[Completed: ${task.timesCompleted} times]`; setTimeout(() => counterSpan.classList.remove('animate-counter'), 600); }
                    
                    popupTaskName.textContent = task.isNegative ? `"${task.name}" Penalty Applied!` : `"${task.name}" Complete!`;
                    let rewardsMsg = task.isNegative ? `Lost: <span class="reward-penalty">${actualXp} XP</span>, <span class="reward-penalty">${actualGold} Gold</span>, <span class="reward-penalty">${hpChange} HP</span>`
                                                  : `Gained: <span>${actualXp} XP</span>, <span>${actualGold} Gold</span>`;
                    if (task.associatedStat && task.associatedStat !== "none" && !task.isNegative) { rewardsMsg += `, <span>+1 ${task.associatedStat.charAt(0).toUpperCase() + task.associatedStat.slice(1)}</span>`; }
                    popupRewards.innerHTML = rewardsMsg;
                    if (popupAutoHideTimeout) clearTimeout(popupAutoHideTimeout);
                    taskCompletePopup.classList.remove('hidden', 'animate-out'); taskCompletePopup.classList.add('animate-in');
                    popupAutoHideTimeout = setTimeout(() => { hideCompletionPopup(); popupAutoHideTimeout = null; }, 2500); 
                    
                    renderGame(); saveGameData();
                    if (taskElement) taskElement.classList.remove(task.isNegative ? 'task-penalizing' : 'task-completing');
                }, 600);
            } else { 
                task.timesCompleted++; 
                let actualXp = task.xp; let actualGold = task.gold;
                if (task.isBonus) { actualXp = Math.round(actualXp * 1.20); actualGold = Math.round(actualGold * 1.20); }
                player.currentXP += actualXp; player.gold += actualGold;
                if (task.associatedStat && task.associatedStat !== "none" && player.hasOwnProperty(task.associatedStat)) player[task.associatedStat]++;
                checkLevelUp(); renderGame(); saveGameData();
            }
        }
        console.log("[completeTask] Finished for task ID:", taskId);
    }
    window.completeTask = completeTask;

    function deleteTask(taskId) { 
        console.log("[deleteTask] Called for task ID:", taskId);
        const taskIndex = tasks.findIndex(t => t.id === taskId);
        if (taskIndex > -1) {
            const taskElement = taskListUl.querySelector(`li[data-id="${taskId}"]`);
            if (taskElement) { taskElement.classList.add('task-deleting'); setTimeout(() => { tasks.splice(taskIndex, 1); renderGame(); saveGameData(); }, 500); } else { tasks.splice(taskIndex, 1); renderGame(); saveGameData(); }
        }
        console.log("[deleteTask] Finished for task ID:", taskId);
    }
    window.deleteTask = deleteTask;

    filterCategorySelect.addEventListener('change', (event) => { currentFilterCategory = event.target.value; renderGame(); });
    
    function renderGame() { 
        console.log("[renderGame] Called. Current tasks count:", tasks.length); 
        renderTasks(); 
        updatePlayerStatsDisplay(); 
        console.log("[renderGame] Finished."); 
    }
    
    function saveGameData() { 
        console.log("[saveGameData] Called.");
        localStorage.setItem('rpgTasks', JSON.stringify(tasks)); 
        localStorage.setItem('rpgPlayerStats', JSON.stringify(player)); 
        localStorage.setItem('rpgNextTaskNumber', window.nextTaskNumber.toString()); 
        console.log("[saveGameData] Finished.");
    }
    
    function loadGameData() { 
        console.log("[loadGameData] Called.");
        // ... (rest of loadGameData as before, ensuring it uses window.nextTaskNumber if it was global) ...
        const storedTasks = localStorage.getItem('rpgTasks');
        const storedPlayerStats = localStorage.getItem('rpgPlayerStats');
        const storedNextTaskNumber = localStorage.getItem('rpgNextTaskNumber');
        if (storedTasks) {
            window.tasks = JSON.parse(storedTasks); // Ensure tasks is assigned to window.tasks if it's global
            window.tasks.forEach(task => {
                if (task.timesCompleted === undefined) task.timesCompleted = 0;
                if (task.nameColor === undefined) task.nameColor = "#5d4037";
                if (task.associatedStat === undefined) task.associatedStat = "none";
                if (task.category === undefined) task.category = taskCategories[0] || "General";
                if (task.icon === undefined) task.icon = taskIcons[taskIcons.length - 1] || "❓";
                if (task.customImage === undefined) task.customImage = null;
                if (task.isBonus === undefined) task.isBonus = false; 
                if (task.isNegative === undefined) task.isNegative = false; 
                if (task.hpPenalty === undefined && difficultySettings[task.difficulty]) { 
                    task.hpPenalty = baseDifficultySettings[task.difficulty]?.hpPenalty || 5; 
                }
            });
        } else {
            window.tasks = [];
        }
        if (storedPlayerStats) { 
            const loadedPlayer = JSON.parse(storedPlayerStats); 
            const defaultPlayerStateWithHP = {...initialPlayerState, maxHP: 50, currentHP: 50}; 
            window.player = { ...defaultPlayerStateWithHP, ...window.player, ...loadedPlayer }; 
            if(window.player.maxHP === undefined || (loadedPlayer.vitality && window.player.vitality !== loadedPlayer.vitality)) window.player.maxHP = calculateMaxHP(); 
            if(window.player.currentHP === undefined || window.player.currentHP > window.player.maxHP) window.player.currentHP = window.player.maxHP; 
        } else {
            window.player = JSON.parse(JSON.stringify(initialPlayerState)); 
            window.player.maxHP = calculateMaxHP();
            window.player.currentHP = window.player.maxHP;
        }
        if (storedNextTaskNumber) window.nextTaskNumber = parseInt(storedNextTaskNumber, 10); 
        else window.nextTaskNumber = 1;
        
        window.player.xpToNextLevel = (window.player.level < xpLevels.length) ? xpLevels[window.player.level] : Infinity;
        updatePlayerStatsDisplay(); 
        renderGame(); 
        console.log("[loadGameData] Finished.");
    }
    window.loadGameData = loadGameData; window.loadTasks = loadGameData;
    
    resetGameBtn.addEventListener('click', () => { 
        console.log("[resetGameBtn] Clicked.");
        if (confirm("Are you sure you want to reset all game data? This includes player level, XP, gold, attributes, HP, and all task completion counts. This cannot be undone.")) {
            player = JSON.parse(JSON.stringify(initialPlayerState));
            player.maxHP = calculateMaxHP(); 
            player.currentHP = player.maxHP; 
            player.xpToNextLevel = xpLevels[initialPlayerState.level] || initialPlayerState.xpToNextLevel;
            tasks.forEach(task => { task.timesCompleted = 0; });
            window.nextTaskNumber = 1; 
            saveGameData(); renderGame();
            alert("Game data has been reset!");
        }
    });

    // Page Navigation Logic
    if (viewTasksBtn && statsPage && tasksPage) {
        viewTasksBtn.addEventListener('click', () => {
            statsPage.classList.add('page-hidden');
            tasksPage.classList.remove('page-hidden');
            console.log("Navigated to Tasks Page");
        });
    } else {
        console.error("viewTasksBtn, statsPage, or tasksPage not found for 'View Tasks' navigation.");
    }

    if (backToStatsBtn && statsPage && tasksPage) {
        backToStatsBtn.addEventListener('click', () => {
            tasksPage.classList.add('page-hidden');
            statsPage.classList.remove('page-hidden');
            console.log("Navigated back to Stats Page");
        });
    } else {
        console.error("backToStatsBtn, statsPage, or tasksPage not found for 'Back to Stats' navigation.");
    }

    // Initial page setup: Ensure statsPage is visible and tasksPage is hidden
    if (statsPage && tasksPage) {
        statsPage.classList.remove('page-hidden');
        tasksPage.classList.add('page-hidden');
    } else {
        console.error("Could not set initial page visibility: statsPage or tasksPage missing.");
    }
});
