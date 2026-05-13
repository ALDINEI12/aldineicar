const SUPABASE_URL = "https://nhqipyzikujszddoxlir.supabase.co";
const SUPABASE_KEY = "sb_publishable_PRTUmHIzf0pbq09qn9RwvQ_DZQowl4D";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

window.handleSignup = async function () {

  const email = document.getElementById("signupEmail").value.trim();
  const password = document.getElementById("signupPassword").value;
  const name = document.getElementById("signupName").value.trim();
  const error = document.getElementById("signupError");

  error.textContent = "";

  try {

    const { error: signupError } =
      await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name
          }
        }
      });

    if (signupError) throw signupError;

    error.style.color = "#00a651";
    error.textContent =
      "Conta criada com sucesso!";

  } catch (err) {

    error.style.color = "#d40000";
    error.textContent = err.message;
  }
};

window.handleLogin = async function () {

  const email = document.getElementById("loginEmail").value.trim();

  const password =
    document.getElementById("loginPassword").value;

  const error =
    document.getElementById("loginError");

  error.textContent = "";

  try {

    const { data, error: loginError } =
      await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

    if (loginError) throw loginError;

    if (data.user) {

      document.getElementById("loginOverlay")
        .style.display = "none";

      document.getElementById("appContainer")
        .style.display = "flex";
    }

  } catch (err) {

    error.style.color = "#d40000";
    error.textContent = err.message;
  }
};

async function verificarSessao() {

  const {
    data: { session }
  } = await supabaseClient.auth.getSession();

  if (session) {

    document.getElementById("loginOverlay")
      .style.display = "none";

    document.getElementById("appContainer")
      .style.display = "flex";
  }
}

verificarSessao();

document.addEventListener("DOMContentLoaded", () => {

  const signupBtn =
    document.querySelector('[onclick*="handleSignup"]');

  if (signupBtn) {

    signupBtn.onclick = async function (e) {

      e.preventDefault();

      await window.handleSignup();
    };
  }
});

window.addEventListener("load", () => {

  const buttons = document.querySelectorAll("button");

  buttons.forEach((btn) => {

    if (
      btn.innerText.includes("Cadastrar") ||
      btn.textContent.includes("Cadastrar")
    ) {

      btn.onclick = async function (e) {

        e.preventDefault();
        e.stopPropagation();

        console.log("Cadastro Supabase acionado");

        await window.handleSignup();

        return false;
      };
    }
  });
});

window.toggleAuthTab = function(tab){

  const loginTab =
    document.getElementById("loginTab");

  const signupTab =
    document.getElementById("signupTab");

  const recoveryTab =
    document.getElementById("recoveryTab");

  const resetTab =
    document.getElementById("resetTab");

  if(loginTab) loginTab.style.display = "none";
  if(signupTab) signupTab.style.display = "none";
  if(recoveryTab) recoveryTab.style.display = "none";
  if(resetTab) resetTab.style.display = "none";

  if(tab === "login" && loginTab){
    loginTab.style.display = "block";
  }

  if(tab === "signup" && signupTab){
    signupTab.style.display = "block";
  }

  if(tab === "recovery" && recoveryTab){
    recoveryTab.style.display = "block";
  }

  if(tab === "reset" && resetTab){
    resetTab.style.display = "block";
  }
};

function toggleAuthTab(tab) {
  const loginTab = document.getElementById('loginTab');
  const signupTab = document.getElementById('signupTab');
  const recoveryTab = document.getElementById('recoveryTab');
  const resetTab = document.getElementById('resetTab');

  const loginBtn = document.getElementById('tabBtnLogin');
  const signupBtn = document.getElementById('tabBtnSignup');

  loginTab.style.display = 'none';
  signupTab.style.display = 'none';
  recoveryTab.style.display = 'none';
  resetTab.style.display = 'none';

  if (tab === 'signup') {
    signupTab.style.display = 'block';

    signupBtn.style.background = '#ffd700';
    signupBtn.style.color = '#111';
    signupBtn.style.border = '2px solid #ffd700';

    loginBtn.style.background = 'transparent';
    loginBtn.style.color = '#fff';
    loginBtn.style.border = '2px solid #444';

  } else if (tab === 'recovery') {
    recoveryTab.style.display = 'block';

  } else if (tab === 'reset') {
    resetTab.style.display = 'block';

  } else {
    loginTab.style.display = 'block';

    loginBtn.style.background = '#ffd700';
    loginBtn.style.color = '#111';
    loginBtn.style.border = '2px solid #ffd700';

    signupBtn.style.background = 'transparent';
    signupBtn.style.color = '#fff';
    signupBtn.style.border = '2px solid #444';
  }
}