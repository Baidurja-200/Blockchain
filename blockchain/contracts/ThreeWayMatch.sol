// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ThreeWayMatch
 * @notice On-chain reference implementation of the three-way invoice
 *         verification workflow used by the ChainVerify platform:
 *         Purchase Order -> Goods Receipt Note -> Vendor Invoice.
 *
 *         The Node/Express backend runs an equivalent simulated ledger
 *         (SHA-256 hash-chained blocks persisted in MongoDB) so the app is
 *         fully demoable without a live chain, but this contract shows how
 *         the same rules translate to real Solidity for a production
 *         deployment on an EVM network.
 */
contract ThreeWayMatch {
    enum InvoiceStatus {
        None,
        Pending,
        Approved,
        Rejected
    }

    struct PurchaseOrder {
        string poNumber;
        string vendor;
        uint256 quantity;
        uint256 totalAmount; // stored in smallest currency unit (e.g. cents)
        bool exists;
    }

    struct GoodsReceipt {
        string grnNumber;
        string poNumber;
        uint256 quantityReceived;
        bool exists;
    }

    struct Invoice {
        string invoiceNumber;
        string poNumber;
        string grnNumber;
        uint256 invoiceAmount;
        InvoiceStatus status;
        bool exists;
    }

    address public owner;

    mapping(bytes32 => PurchaseOrder) public purchaseOrders; // key: keccak256(poNumber)
    mapping(bytes32 => GoodsReceipt) public goodsReceipts; // key: keccak256(grnNumber)
    mapping(bytes32 => Invoice) public invoices; // key: keccak256(invoiceNumber)
    mapping(bytes32 => bool) public poInvoiced; // prevents duplicate invoicing of the same PO

    uint256 public transactionCount;

    event PurchaseOrderRecorded(string poNumber, string vendor, uint256 totalAmount, uint256 timestamp);
    event GoodsReceiptRecorded(string grnNumber, string poNumber, uint256 quantityReceived, uint256 timestamp);
    event InvoiceSubmitted(string invoiceNumber, string poNumber, string grnNumber, uint256 invoiceAmount, uint256 timestamp);
    event InvoiceValidated(
        string invoiceNumber,
        bool poExists,
        bool grnExists,
        bool duplicateInvoice,
        bool amountMatches,
        bool quantitySufficient,
        bool approved,
        uint256 timestamp
    );
    event TransactionRecorded(string referenceId, string transactionType, uint256 blockNumberOnChain, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "ThreeWayMatch: caller is not the owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function _key(string memory value) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(value));
    }

    /// @notice Generic hook mirroring the backend's blockchainService.mineBlock() call,
    /// used so every off-chain transaction type also has an on-chain audit event.
    function recordTransaction(string calldata referenceId, string calldata transactionType) external {
        transactionCount += 1;
        emit TransactionRecorded(referenceId, transactionType, block.number, block.timestamp);
    }

    function createPurchaseOrder(
        string calldata poNumber,
        string calldata vendor,
        uint256 quantity,
        uint256 totalAmount
    ) external {
        bytes32 key = _key(poNumber);
        require(!purchaseOrders[key].exists, "ThreeWayMatch: PO already exists");

        purchaseOrders[key] = PurchaseOrder(poNumber, vendor, quantity, totalAmount, true);
        emit PurchaseOrderRecorded(poNumber, vendor, totalAmount, block.timestamp);
    }

    function createGoodsReceipt(
        string calldata grnNumber,
        string calldata poNumber,
        uint256 quantityReceived
    ) external {
        bytes32 grnKey = _key(grnNumber);
        require(!goodsReceipts[grnKey].exists, "ThreeWayMatch: GRN already exists");

        bytes32 poKey = _key(poNumber);
        PurchaseOrder memory po = purchaseOrders[poKey];
        require(po.exists, "ThreeWayMatch: PO not found");
        require(quantityReceived <= po.quantity, "ThreeWayMatch: Received quantity exceeds PO ordered quantity");

        goodsReceipts[grnKey] = GoodsReceipt(grnNumber, poNumber, quantityReceived, true);
        emit GoodsReceiptRecorded(grnNumber, poNumber, quantityReceived, block.timestamp);
    }

    /**
     * @notice Submits an invoice and immediately runs the three-way match:
     *         PO exists AND GRN exists AND not a duplicate AND amount matches
     *         AND GRN quantity satisfies the PO quantity => Approved, else Rejected.
     */
    function submitInvoice(
        string calldata invoiceNumber,
        string calldata poNumber,
        string calldata grnNumber,
        uint256 invoiceAmount
    ) external returns (bool approved) {
        bytes32 invKey = _key(invoiceNumber);
        require(!invoices[invKey].exists, "ThreeWayMatch: invoice number already used");

        bytes32 poKey = _key(poNumber);
        bytes32 grnKey = _key(grnNumber);

        PurchaseOrder memory po = purchaseOrders[poKey];
        GoodsReceipt memory grn = goodsReceipts[grnKey];

        bool poExists = po.exists;
        bool grnExists = grn.exists && (_key(grn.poNumber) == poKey);
        bool duplicateInvoice = poInvoiced[poKey];
        bool amountMatches = poExists && po.totalAmount == invoiceAmount;
        bool quantitySufficient = poExists && grnExists && grn.quantityReceived >= po.quantity;

        approved = poExists && grnExists && !duplicateInvoice && amountMatches && quantitySufficient;

        invoices[invKey] = Invoice({
            invoiceNumber: invoiceNumber,
            poNumber: poNumber,
            grnNumber: grnNumber,
            invoiceAmount: invoiceAmount,
            status: approved ? InvoiceStatus.Approved : InvoiceStatus.Rejected,
            exists: true
        });

        if (approved) {
            poInvoiced[poKey] = true;
        }

        emit InvoiceSubmitted(invoiceNumber, poNumber, grnNumber, invoiceAmount, block.timestamp);
        emit InvoiceValidated(invoiceNumber, poExists, grnExists, duplicateInvoice, amountMatches, quantitySufficient, approved, block.timestamp);
    }

    function getInvoiceStatus(string calldata invoiceNumber) external view returns (InvoiceStatus) {
        return invoices[_key(invoiceNumber)].status;
    }
}
