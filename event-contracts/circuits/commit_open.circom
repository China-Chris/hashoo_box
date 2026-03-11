pragma circom 2.0.0;

// Public list must name input signals only. Prover supplies commitment as input;
// constraint forces commitment == salt + amount (mod field).
template CommitOpen() {
    signal input salt;
    signal input amount;
    signal input commitment;
    commitment === salt + amount;
}

component main { public [commitment] } = CommitOpen();
