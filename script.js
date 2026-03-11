let balance = 0;

function updateBalance(){
document.getElementById("balance").innerText = balance;
}

function deposit(){

let amount = Number(document.getElementById("amount").value);

if(amount <= 0){
alert("Enter valid amount");
return;
}

balance += amount;

addHistory("Deposited ₹" + amount);

updateBalance();
}

function withdraw(){

let amount = Number(document.getElementById("amount").value);

if(amount > balance){
alert("Insufficient balance");
return;
}

balance -= amount;

addHistory("Withdrew ₹" + amount);

updateBalance();
}

function addHistory(text){

let li = document.createElement("li");
li.innerText = text;

document.getElementById("history").appendChild(li);

}