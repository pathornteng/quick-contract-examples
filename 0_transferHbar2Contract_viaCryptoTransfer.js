console.clear();
require("dotenv").config();
const {
	AccountId,
	PrivateKey,
	Client,
	FileCreateTransaction,
	ContractCreateTransaction,
	ContractFunctionParameters,
	ContractExecuteTransaction,
	ContractCallQuery,
	Hbar,
	TransferTransaction,
	ContractInfoQuery,
	AccountBalanceQuery,
	TransactionRecordQuery,
} = require("@hashgraph/sdk");
const fs = require("fs");

// Configure accounts and client
const operatorId = AccountId.fromString(process.env.OPERATOR_ID);
const operatorKey = PrivateKey.fromString(process.env.OPERATOR_PVKEY);
const treasuryId = AccountId.fromString(process.env.TREASURY_ID);
const treasuryKey = PrivateKey.fromString(process.env.TREASURY_PVKEY);
const aliceId = AccountId.fromString(process.env.ALICE_ID);
const aliceyKey = PrivateKey.fromString(process.env.ALICE_PVKEY);

const client = Client.forTestnet().setOperator(operatorId, operatorKey);

async function main() {
	// Import the compiled contract bytecode
	const contractBytecode = fs.readFileSync(
		"0_transferHbar2Contract_viaCryptoTrans_sol_hbar2Contract.bin"
	);

	// Create a file on Hedera and store the bytecode
	const fileCreateTx = new FileCreateTransaction()
		.setContents(contractBytecode)
		.setKeys([operatorKey])
		.freezeWith(client);
	const fileCreateSign = await fileCreateTx.sign(operatorKey);
	const fileCreateSubmit = await fileCreateSign.execute(client);
	const fileCreateRx = await fileCreateSubmit.getReceipt(client);
	const bytecodeFileId = fileCreateRx.fileId;
	console.log(`- The bytecode file ID is: ${bytecodeFileId} \n`);

	// Instantiate the smart contract
	const contractInstantiateTx = new ContractCreateTransaction()
		.setBytecodeFileId(bytecodeFileId)
		.setGas(100000);
	const contractInstantiateSubmit = await contractInstantiateTx.execute(client);
	const contractInstantiateRx = await contractInstantiateSubmit.getReceipt(client);
	const contractId = contractInstantiateRx.contractId;
	const contractAddress = contractId.toSolidityAddress();
	console.log(`- The smart contract ID is: ${contractId} \n`);
	console.log(`- The smart contract ID in Solidity format is: ${contractAddress} \n`);

	// Transfer HBAR to smart contract using TransferTransaction()
	const contractExecuteTx = new TransferTransaction()
		.addHbarTransfer(treasuryId, -10)
		.addHbarTransfer(contractId, 10)
		.freezeWith(client);
	const contractExecuteSign = await contractExecuteTx.sign(treasuryKey);
	const contractExecuteSubmit = await contractExecuteSign.execute(client);
	const contractExecuteRx = await contractExecuteSubmit.getReceipt(client);
	console.log(`- Crypto transfer to contract: ${contractExecuteRx.status} \n`);

	// Query the contract balance calling the function in the contract
	const contractQueryTx = new ContractCallQuery()
		.setContractId(contractId)
		.setGas(100000)
		.setFunction("getBalance");
	const contractQuerySubmit = await contractQueryTx.execute(client);
	const contractQueryResult = contractQuerySubmit.getUint256(0);
	console.log(`- Contract balance (from getBalance fcn): ${contractQueryResult} \n`);

	const cCheck = await new ContractInfoQuery().setContractId(contractId).execute(client);
	console.log(`- Contract balance (from ContractInfoQuery): ${cCheck.balance.toString()} \n`);
}
main();
