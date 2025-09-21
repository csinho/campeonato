// ========================================
// SHARED FUNCTIONS - FUNÇÕES COMPARTILHADAS
// ========================================
// Este arquivo contém funções comuns entre index.html e admin.html
// para facilitar a manutenção e evitar duplicação de código
// ========================================
// CONFIGURAÇÃO DO SUPABASE
// ========================================
const SUPABASE_URL = 'https://ghdkpkrvneamcxyhmnfr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdoZGtwa3J2bmVhbWN4eWhtbmZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyOTQ3MjQsImV4cCI6MjA3Mzg3MDcyNH0.BbNLh1ZBHGbWynRtFAR79Nx9D6PwQPjNYYWFV7dPqbU';
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// ========================================
// FUNÇÕES DE AUTENTICAÇÃO
// ========================================
// Verificar autenticação
async function checkAuth() {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session) {
            currentUser = session.user;
            await loadAdminProfile();
        }
    } catch (error) {
    }
}
// Carregar perfil do admin
async function loadAdminProfile() {
    try {
        if (!currentUser) return;
        const { data, error } = await supabaseClient
            .from('admins')
            .select('*')
            .eq('user_id', currentUser.id)
            .single();
        if (error) {
            return;
        }
        currentAdmin = data;
        // Mostrar acesso administrativo se for admin
        if (typeof showAdminAccess === 'function') {
            showAdminAccess();
        }
    } catch (error) {
    }
}
// ========================================
// FUNÇÕES DE CARREGAMENTO DE DADOS
// ========================================
// Carregar times
async function loadTeams() {
    try {
        const { data, error } = await supabaseClient
            .from('teams')
            .select('*')
            .order('name');
        if (error) throw error;
        teams = data || [];
    } catch (error) {
        if (typeof showAlert === 'function') {
            showAlert('Erro ao carregar times: ' + error.message, 'error');
        }
    }
}
// Carregar jogadores
async function loadPlayers() {
    try {
        const { data, error } = await supabaseClient
            .from('players')
            .select('*')
            .order('name');
        if (error) throw error;
        players = data || [];
    } catch (error) {
        if (typeof showAlert === 'function') {
            showAlert('Erro ao carregar jogadores: ' + error.message, 'error');
        }
    }
}
// Carregar partidas
async function loadMatches() {
    try {
        const { data, error } = await supabaseClient
            .from('matches')
            .select('*')
            .order('match_date', { ascending: false });
        if (error) throw error;
        matches = data || [];
    } catch (error) {
        if (typeof showAlert === 'function') {
            showAlert('Erro ao carregar partidas: ' + error.message, 'error');
        }
    }
}
// Carregar regras
async function loadRules() {
    try {
        const { data, error } = await supabaseClient
            .from('rules')
            .select('*')
            .order('title');
        if (error) throw error;
        rules = data || [];
    } catch (error) {
        if (typeof showAlert === 'function') {
            showAlert('Erro ao carregar regras: ' + error.message, 'error');
        }
    }
}
// Carregar gols
async function loadGoals() {
    try {
        const { data, error } = await supabaseClient
            .from('goals')
            .select('*');
        if (error) throw error;
        goals = data || [];
    } catch (error) {
        if (typeof showAlert === 'function') {
            showAlert('Erro ao carregar gols: ' + error.message, 'error');
        }
    }
}
// ========================================
// FUNÇÕES DE GOLS DE OUTROS JOGADORES
// ========================================
// Carregar jogadores de outros times
function loadOtherPlayers() {
    const homeTeam = teams.find(t => t.id === currentMatch.team_home_id);
    const awayTeam = teams.find(t => t.id === currentMatch.team_away_id);
    // Filtrar jogadores que NÃO são dos times da partida
    const otherPlayers = players.filter(p => 
        p.team_id !== homeTeam?.id && p.team_id !== awayTeam?.id
    );
    const select = document.getElementById('other-player-select');
    if (select) {
        select.innerHTML = '<option value="">Selecione um jogador</option>';
        otherPlayers.forEach(player => {
            const playerTeam = teams.find(t => t.id === player.team_id);
            const option = document.createElement('option');
            option.value = player.id;
            option.textContent = `${player.name} (${playerTeam?.name || 'Time não encontrado'})`;
            select.appendChild(option);
        });
    }
}
// Carregar gols de outros jogadores existentes
function loadOtherPlayerGoals() {
    otherPlayerGoals = [];
    const existingGoals = goals.filter(g => g.match_id === currentMatch.id);
    // Buscar gols de jogadores que não são dos times da partida
    const homeTeam = teams.find(t => t.id === currentMatch.team_home_id);
    const awayTeam = teams.find(t => t.id === currentMatch.team_away_id);
    // Agrupar gols por jogador para contar quantos gols cada um fez
    const goalsByPlayer = {};
    existingGoals.forEach(goal => {
        const player = players.find(p => p.id === goal.player_id);
        if (player && player.team_id !== homeTeam?.id && player.team_id !== awayTeam?.id) {
            if (!goalsByPlayer[goal.player_id]) {
                goalsByPlayer[goal.player_id] = {
                    player_id: goal.player_id,
                    player_name: player.name,
                    count: 0
                };
            }
            goalsByPlayer[goal.player_id].count++;
        }
    });
    // Converter para array e determinar para qual time foi o gol
    // Como não temos team_id na tabela goals, vamos assumir que gols de outros jogadores
    // são gols contra (para o time adversário)
    Object.values(goalsByPlayer).forEach(goal => {
        // Por padrão, vamos colocar como gol para o time da casa
        // Isso pode ser ajustado manualmente pelo usuário
        otherPlayerGoals.push({
            ...goal,
            team: 'home' // Padrão, pode ser alterado pelo usuário
        });
    });
    renderOtherPlayerGoals();
}
// Renderizar lista de gols de outros jogadores
function renderOtherPlayerGoals() {
    const container = document.getElementById('other-goals-list');
    if (!container) return;
    if (otherPlayerGoals.length === 0) {
        container.innerHTML = '<p style="color: #6b7280; font-size: 0.875rem; text-align: center; padding: 1rem;">Nenhum gol de outros jogadores</p>';
        return;
    }
    container.innerHTML = otherPlayerGoals.map((goal, index) => {
        const teamName = goal.team === 'home' ? 
            teams.find(t => t.id === currentMatch.team_home_id)?.name : 
            teams.find(t => t.id === currentMatch.team_away_id)?.name;
        return `
            <div class="other-goal-item">
                <span>${goal.player_name} → ${teamName} (${goal.count} gol${goal.count > 1 ? 's' : ''})</span>
                <button type="button" class="remove-btn" onclick="removeOtherPlayerGoal(${index})">Remover</button>
            </div>
        `;
    }).join('');
}
// Adicionar gol de outro jogador
function addOtherPlayerGoal() {
    const playerId = document.getElementById('other-player-select').value;
    const goalTeam = document.getElementById('other-goal-team').value;
    const goalCount = parseInt(document.getElementById('other-goal-count').value) || 1;
    if (!playerId || !goalTeam) {
        const message = 'Por favor, selecione um jogador e para qual time foi o gol.';
        if (typeof showAlert === 'function') {
            showAlert(message, 'error');
        } else {
            showAlertModal('Erro', message);
        }
        return;
    }
    const player = players.find(p => p.id === playerId);
    if (!player) return;
    // Verificar se já existe um gol deste jogador
    const existingIndex = otherPlayerGoals.findIndex(g => g.player_id === playerId && g.team === goalTeam);
    if (existingIndex >= 0) {
        otherPlayerGoals[existingIndex].count += goalCount;
    } else {
        otherPlayerGoals.push({
            player_id: playerId,
            player_name: player.name,
            team: goalTeam,
            count: goalCount
        });
    }
    renderOtherPlayerGoals();
    if (typeof updateScoreFromPlayers === 'function') {
        updateScoreFromPlayers();
    }
    // Limpar campos
    document.getElementById('other-player-select').value = '';
    document.getElementById('other-goal-team').value = '';
    document.getElementById('other-goal-count').value = '1';
}
// Remover gol de outro jogador
function removeOtherPlayerGoal(index) {
    otherPlayerGoals.splice(index, 1);
    renderOtherPlayerGoals();
    if (typeof updateScoreFromPlayers === 'function') {
        updateScoreFromPlayers();
    }
}
// ========================================
// FUNÇÕES DE PLACAR E GOLS
// ========================================
// Atualizar placar baseado nos gols dos jogadores
async function updateScoreFromPlayers() {
    const homeGoalInputs = document.querySelectorAll('#home-players-goals input[type="number"]');
    const awayGoalInputs = document.querySelectorAll('#away-players-goals input[type="number"]');
    let homeTotalGoals = 0;
    let awayTotalGoals = 0;
    // Gols dos jogadores dos times da partida
    homeGoalInputs.forEach(input => {
        const goals = parseInt(input.value) || 0;
        homeTotalGoals += goals;
    });
    awayGoalInputs.forEach(input => {
        const goals = parseInt(input.value) || 0;
        awayTotalGoals += goals;
    });
    // Gols de outros jogadores
    otherPlayerGoals.forEach(goal => {
        if (goal.team === 'home') {
            homeTotalGoals += goal.count;
        } else {
            awayTotalGoals += goal.count;
        }
    });
    // Atualizar os campos de placar
    const homeGoalsInput = document.getElementById('home-goals');
    const awayGoalsInput = document.getElementById('away-goals');
    if (homeGoalsInput) homeGoalsInput.value = homeTotalGoals;
    if (awayGoalsInput) awayGoalsInput.value = awayTotalGoals;
    // Salvar placar em tempo real no banco (apenas se a partida já foi iniciada)
    if (currentMatch && typeof saveScoreToDatabase === 'function') {
        const matchFinished = document.getElementById('match-finished');
        // Só salva se a partida já foi iniciada (não está mais "scheduled")
        if (currentMatch.status !== 'scheduled' && matchFinished && !matchFinished.checked) {
            await saveScoreToDatabase(homeTotalGoals, awayTotalGoals, false);
        }
    }
}
// Salvar placar no banco de dados
async function saveScoreToDatabase(homeGoals, awayGoals, isFinished) {
    try {
        const status = isFinished ? 'finished' : 'in_progress';
        const { error } = await supabaseClient
            .from('matches')
            .update({
                home_goals: homeGoals,
                away_goals: awayGoals,
                status: status
            })
            .eq('id', currentMatch.id);
        if (error) {
            throw error;
        }
        // Atualizar dados locais
        currentMatch.home_goals = homeGoals;
        currentMatch.away_goals = awayGoals;
        currentMatch.status = status;
    } catch (error) {
        throw error;
    }
}
// Processar gols dos jogadores
async function processPlayerGoals() {
    const homeGoalInputs = document.querySelectorAll('#home-players-goals input[type="number"]');
    const awayGoalInputs = document.querySelectorAll('#away-players-goals input[type="number"]');
    // Remover gols existentes da partida
    const { error: deleteError } = await supabaseClient
        .from('goals')
        .delete()
        .eq('match_id', currentMatch.id);
    if (deleteError) {
        throw deleteError;
    }
    const goalsToInsert = [];
    // Gols dos jogadores dos times da partida
    homeGoalInputs.forEach(input => {
        const goals = parseInt(input.value) || 0;
        if (goals > 0) {
            // Inserir um registro para cada gol marcado
            for (let i = 0; i < goals; i++) {
                goalsToInsert.push({
                    match_id: currentMatch.id,
                    player_id: input.dataset.playerId,
                    minute: 0, // Minuto padrão, pode ser ajustado depois
                    created_at: new Date().toISOString()
                });
            }
        }
    });
    awayGoalInputs.forEach(input => {
        const goals = parseInt(input.value) || 0;
        if (goals > 0) {
            // Inserir um registro para cada gol marcado
            for (let i = 0; i < goals; i++) {
                goalsToInsert.push({
                    match_id: currentMatch.id,
                    player_id: input.dataset.playerId,
                    minute: 0, // Minuto padrão, pode ser ajustado depois
                    created_at: new Date().toISOString()
                });
            }
        }
    });
    // Gols de outros jogadores
    otherPlayerGoals.forEach(goal => {
        for (let i = 0; i < goal.count; i++) {
            goalsToInsert.push({
                match_id: currentMatch.id,
                player_id: goal.player_id,
                minute: 0,
                created_at: new Date().toISOString()
            });
        }
    });
    if (goalsToInsert.length > 0) {
        const { error: insertError } = await supabaseClient
            .from('goals')
            .insert(goalsToInsert);
        if (insertError) {
            throw insertError;
        }
    }
}
// ========================================
// FUNÇÕES DE CLASSIFICAÇÃO
// ========================================
// Calcular classificação dos times (apenas partidas iniciadas/finalizadas)
function calculateTeamClassification(teams, matches) {
    return teams.map(team => {
        // Filtrar apenas partidas que foram iniciadas (com gols) ou finalizadas
        const teamMatches = matches.filter(match => {
            const isParticipating = match.team_home_id === team.id || match.team_away_id === team.id;
            const hasStarted = match.home_goals !== null && match.away_goals !== null;
            const isFinished = match.status === 'finished';
            // Só conta partidas que foram iniciadas (com gols) ou finalizadas
            return isParticipating && (hasStarted || isFinished);
        });
        let pontos = 0;
        let jogos = teamMatches.length;
        let vitorias = 0;
        let empates = 0;
        let derrotas = 0;
        let golsPro = 0;
        let golsContra = 0;
        teamMatches.forEach(match => {
            const isHome = match.team_home_id === team.id;
            const teamGoals = isHome ? (match.home_goals || 0) : (match.away_goals || 0);
            const opponentGoals = isHome ? (match.away_goals || 0) : (match.home_goals || 0);
            golsPro += teamGoals;
            golsContra += opponentGoals;
            if (teamGoals > opponentGoals) {
                vitorias++;
                pontos += 3;
            } else if (teamGoals === opponentGoals) {
                empates++;
                pontos += 1;
            } else {
                derrotas++;
            }
        });
        const saldoGols = golsPro - golsContra;
        return {
            ...team,
            pontos,
            jogos,
            vitorias,
            empates,
            derrotas,
            golsPro,
            golsContra,
            saldoGols
        };
    }).sort((a, b) => {
        // Ordenar por pontos (descendente), depois por saldo de gols
        if (b.pontos !== a.pontos) return b.pontos - a.pontos;
        return b.saldoGols - a.saldoGols;
    });
}
// ========================================
// FUNÇÕES DE ORGANIZAÇÃO DE PARTIDAS
// ========================================
// Organizar partidas em rodadas (2 jogos por rodada)
function organizeMatchesInRounds(matches, teams) {
    if (!matches || matches.length === 0) return [];
    // Criar mapa de times para facilitar busca
    const teamMap = {};
    teams.forEach(team => {
        teamMap[team.id] = team;
    });
    // Organizar partidas com informações dos times
    const matchesWithTeams = matches.map(match => ({
        ...match,
        homeTeam: teamMap[match.team_home_id],
        awayTeam: teamMap[match.team_away_id]
    }));
    // Organizar em rodadas garantindo que cada time jogue apenas uma vez por rodada
    const rounds = [];
    const usedMatches = new Set();
    while (usedMatches.size < matchesWithTeams.length) {
        const currentRound = [];
        const usedTeamsInRound = new Set();
        // Procurar partidas que não foram usadas e cujos times não jogaram nesta rodada
        for (let i = 0; i < matchesWithTeams.length; i++) {
            if (usedMatches.has(i)) continue;
            const match = matchesWithTeams[i];
            const homeTeamId = match.team_home_id;
            const awayTeamId = match.team_away_id;
            // Verificar se algum dos times já jogou nesta rodada
            if (usedTeamsInRound.has(homeTeamId) || usedTeamsInRound.has(awayTeamId)) {
                continue;
            }
            // Adicionar partida à rodada atual
            currentRound.push(match);
            usedMatches.add(i);
            usedTeamsInRound.add(homeTeamId);
            usedTeamsInRound.add(awayTeamId);
            // Se já temos 2 partidas nesta rodada, parar
            if (currentRound.length >= 2) {
                break;
            }
        }
        // Se encontrou partidas para esta rodada, adicionar
        if (currentRound.length > 0) {
            rounds.push({
                roundNumber: rounds.length + 1,
                matches: currentRound
            });
        }
    }
    return rounds;
}
// ========================================
// FUNÇÕES DE UTILIDADE
// ========================================
// Formatar data para exibição
function formatDate(dateString) {
    // Garantir que a data seja interpretada corretamente (usar timezone local)
    const [year, month, day] = dateString.split('-');
    const date = new Date(year, month - 1, day); // month - 1 porque Date usa 0-11
    return date.toLocaleDateString('pt-BR');
}
// Formatar data para exibição em modais (mais detalhada)
function formatDateForModal(dateString) {
    // Garantir que a data seja interpretada corretamente (usar timezone local)
    const [year, month, day] = dateString.split('-');
    const date = new Date(year, month - 1, day); // month - 1 porque Date usa 0-11
    return date.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}
// Gerar datas das sextas-feiras
function generateFridayDates() {
    const dates = [];
    const startDate = new Date('2025-09-12T00:00:00'); // Sexta-feira passada (12/09)
    const endDate = new Date('2025-12-31T00:00:00'); // Final do ano
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
        // Verificar se é sexta-feira (dia 5)
        if (currentDate.getDay() === 5) {
            dates.push({
                value: currentDate.toISOString().split('T')[0],
                label: currentDate.toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                })
            });
        }
        currentDate.setDate(currentDate.getDate() + 1); // Próximo dia
    }
    return dates;
}
// Mostrar erro
function showError(message) {
    if (typeof showAlert === 'function') {
        showAlert(message, 'error');
    } else {
    }
}
// Mostrar sucesso
function showSuccess(message) {
    if (typeof showAlert === 'function') {
        showAlert(message, 'success');
    } else {
    }
}
// ========================================
// EXPORTAR FUNÇÕES (se necessário)
// ========================================
// As funções ficam disponíveis globalmente quando o script é carregado
