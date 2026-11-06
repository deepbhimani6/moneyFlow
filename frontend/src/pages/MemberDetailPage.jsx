import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Paper,
  Chip,
  Avatar,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  TablePagination,
  Stack,
  CircularProgress,
  TextField,
  InputAdornment,
  Card,
  CardContent,
  Breadcrumbs,
  Link,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SearchIcon from "@mui/icons-material/Search";
import CallReceivedIcon from "@mui/icons-material/CallReceived";
import PaymentIcon from "@mui/icons-material/Payment";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import CallSplitIcon from "@mui/icons-material/CallSplit";
import PriceCheckIcon from "@mui/icons-material/PriceCheck";
import { memberService } from "../services/api";
import { formatDate, formatAmount, capitalizeName } from "../utils/formatters";

const MemberDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [directionFilter, setDirectionFilter] = useState("all"); // "all", "receive", "pay"
  const [statusFilter, setStatusFilter] = useState("all"); // "all", "Pending", "Settled"
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const fetchMemberDetail = async () => {
    try {
      setLoading(true);
      const res = await memberService.getMemberEntriesDetail(id);
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error("Error fetching member details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchMemberDetail();
    }
  }, [id]);

  const member = data?.member;
  const stats = data?.stats || {
    pendingReceiveAmount: 0,
    pendingPayAmount: 0,
    totalReceivedAmount: 0,
    totalPaidAmount: 0,
    netBalance: 0,
    totalEntries: 0,
    receiveEntriesCount: 0,
    payEntriesCount: 0,
  };
  const entries = data?.entries || [];

  // Filter entries
  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      // Direction filter
      if (directionFilter === "receive" && e.directionType !== "receive") return false;
      if (directionFilter === "pay" && e.directionType !== "pay") return false;

      // Status filter
      if (statusFilter === "Pending" && e.paymentStatus !== "Pending") return false;
      if (statusFilter === "Settled" && e.paymentStatus !== "Received" && e.paymentStatus !== "Paid") return false;

      // Search keyword
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const desc = (e.description || "").toLowerCase();
        const type = (e.type || "").toLowerCase();
        const amt = String(e.amount);
        const date = (e.date || "").toLowerCase();
        const creator = (e.creatorName || "").toLowerCase();
        if (
          !desc.includes(q) &&
          !type.includes(q) &&
          !amt.includes(q) &&
          !date.includes(q) &&
          !creator.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [entries, directionFilter, statusFilter, searchQuery]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <CircularProgress size={40} />
      </Box>
    );
  }

  if (!member) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <Typography variant="h6" color="text.secondary">
          Member not found
        </Typography>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/members")} sx={{ mt: 2 }}>
          Back to Members
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2.5, md: 3 }, maxWidth: 1200, mx: "auto", width: "100%", boxSizing: "border-box" }}>
      {/* 1. Header & Navigation */}
      <Box sx={{ mb: 2.5 }}>
        <Breadcrumbs sx={{ mb: 1, fontSize: "0.85rem" }}>
          <Link
            underline="hover"
            color="inherit"
            onClick={() => navigate("/members")}
            sx={{ cursor: "pointer", display: "flex", alignItems: "center" }}
          >
            Members
          </Link>
          <Typography color="text.primary" sx={{ fontWeight: 600 }}>
            {capitalizeName(member.fullName)}
          </Typography>
        </Breadcrumbs>

        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1.5 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate("/members")}
            variant="outlined"
            size="small"
            sx={{ textTransform: "none", borderRadius: 2 }}
          >
            Back to Members
          </Button>

          {member.hasJoined ? (
            <Chip
              icon={<CheckCircleOutlineIcon sx={{ "&&": { fontSize: 16 } }} />}
              label="Joined Member"
              color="success"
              size="small"
              sx={{ fontWeight: 600 }}
            />
          ) : member.inviteSent ? (
            <Chip label="Invite Sent" color="primary" variant="outlined" size="small" sx={{ fontWeight: 600 }} />
          ) : (
            <Chip label="Pending Registration" size="small" variant="outlined" />
          )}
        </Box>
      </Box>

      <Stack spacing={{ xs: 2, sm: 2.5 }}>
        {/* 2. Member Profile Card */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 2.5 },
            borderRadius: 3,
            border: "1px solid #e2e8f0",
            bgcolor: "#ffffff",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
            <Avatar
              sx={{
                width: { xs: 48, sm: 56 },
                height: { xs: 48, sm: 56 },
                bgcolor: member.avatarColor || "#1976d2",
                fontSize: { xs: "1.25rem", sm: "1.5rem" },
                fontWeight: 700,
              }}
            >
              {(member.fullName || "M")[0].toUpperCase()}
            </Avatar>

            <Box sx={{ flexGrow: 1, minWidth: 0, overflow: "hidden" }}>
              <Typography variant="h5" sx={{ fontWeight: 800, fontSize: { xs: "1.2rem", sm: "1.45rem" }, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {capitalizeName(member.fullName)}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 0.5, flexWrap: "wrap", minWidth: 0 }}>
                {member.email && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "#64748b", minWidth: 0, maxWidth: "100%" }}>
                    <EmailOutlinedIcon sx={{ fontSize: 16, flexShrink: 0 }} />
                    <Typography variant="body2" sx={{ fontSize: "0.85rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", wordBreak: "break-all" }}>
                      {member.email}
                    </Typography>
                  </Box>
                )}
                {member.phoneNumber && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "#64748b", minWidth: 0, maxWidth: "100%" }}>
                    <PhoneOutlinedIcon sx={{ fontSize: 16, flexShrink: 0 }} />
                    <Typography variant="body2" sx={{ fontSize: "0.85rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {member.phoneNumber}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        </Paper>

        {/* 3. Financial Summary Cards (CSS Grid) */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "repeat(2, 1fr)",
              sm: "repeat(3, 1fr)",
              md: "repeat(5, 1fr)",
            },
            gap: { xs: 1.5, sm: 2 },
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          {/* Card 1: Pending to Receive */}
          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              border: "1px solid #bfdbfe",
              bgcolor: "#f0f9ff",
              p: 1.5,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: "#0284c7", textTransform: "uppercase", fontSize: "0.72rem" }}>
                Pending Receive
              </Typography>
              <Box sx={{ width: 28, height: 28, borderRadius: "50%", bgcolor: "rgba(2, 132, 199, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CallReceivedIcon sx={{ fontSize: 16, color: "#0284c7" }} />
              </Box>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: "#0369a1", fontSize: { xs: "1.15rem", sm: "1.3rem" } }}>
              ₹ {formatAmount(stats.pendingReceiveAmount)}
            </Typography>
            <Typography variant="caption" sx={{ color: "#64748b", fontSize: "0.7rem", mt: 0.25 }}>
              Member owes you
            </Typography>
          </Card>

          {/* Card 2: Pending to Pay */}
          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              border: "1px solid #fed7aa",
              bgcolor: "#fff7ed",
              p: 1.5,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: "#ea580c", textTransform: "uppercase", fontSize: "0.72rem" }}>
                Pending Pay
              </Typography>
              <Box sx={{ width: 28, height: 28, borderRadius: "50%", bgcolor: "rgba(234, 88, 12, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <PaymentIcon sx={{ fontSize: 16, color: "#ea580c" }} />
              </Box>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: "#c2410c", fontSize: { xs: "1.15rem", sm: "1.3rem" } }}>
              ₹ {formatAmount(stats.pendingPayAmount)}
            </Typography>
            <Typography variant="caption" sx={{ color: "#64748b", fontSize: "0.7rem", mt: 0.25 }}>
              You owe member
            </Typography>
          </Card>

          {/* Card 3: Net Balance */}
          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              border: "1px solid #e2e8f0",
              bgcolor: "#ffffff",
              p: 1.5,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: "#475569", textTransform: "uppercase", fontSize: "0.72rem" }}>
                Net Balance
              </Typography>
              <Box sx={{ width: 28, height: 28, borderRadius: "50%", bgcolor: "rgba(71, 85, 105, 0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <AccountBalanceWalletIcon sx={{ fontSize: 16, color: "#475569" }} />
              </Box>
            </Box>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 800,
                color: stats.netBalance > 0 ? "#16a34a" : stats.netBalance < 0 ? "#dc2626" : "#475569",
                fontSize: { xs: "1.15rem", sm: "1.3rem" },
              }}
            >
              ₹ {formatAmount(Math.abs(stats.netBalance))}
            </Typography>
            <Typography variant="caption" sx={{ color: "#64748b", fontSize: "0.7rem", mt: 0.25 }}>
              {stats.netBalance > 0 ? "You will receive" : stats.netBalance < 0 ? "You will pay" : "All settled"}
            </Typography>
          </Card>

          {/* Card 4: Total Received */}
          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              border: "1px solid #e2e8f0",
              bgcolor: "#ffffff",
              p: 1.5,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: "#475569", textTransform: "uppercase", fontSize: "0.72rem" }}>
                Total Received
              </Typography>
              <Box sx={{ width: 28, height: 28, borderRadius: "50%", bgcolor: "rgba(22, 163, 74, 0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CheckCircleOutlineIcon sx={{ fontSize: 16, color: "#16a34a" }} />
              </Box>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: "#16a34a", fontSize: { xs: "1.15rem", sm: "1.3rem" } }}>
              ₹ {formatAmount(stats.totalReceivedAmount)}
            </Typography>
            <Typography variant="caption" sx={{ color: "#64748b", fontSize: "0.7rem", mt: 0.25 }}>
              Settled received
            </Typography>
          </Card>

          {/* Card 5: Total Paid */}
          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              border: "1px solid #e2e8f0",
              bgcolor: "#ffffff",
              p: 1.5,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gridColumn: { xs: "span 2", sm: "span 1" },
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: "#475569", textTransform: "uppercase", fontSize: "0.72rem" }}>
                Total Paid
              </Typography>
              <Box sx={{ width: 28, height: 28, borderRadius: "50%", bgcolor: "rgba(100, 116, 139, 0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <PriceCheckIcon sx={{ fontSize: 16, color: "#64748b" }} />
              </Box>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: "#475569", fontSize: { xs: "1.15rem", sm: "1.3rem" } }}>
              ₹ {formatAmount(stats.totalPaidAmount)}
            </Typography>
            <Typography variant="caption" sx={{ color: "#64748b", fontSize: "0.7rem", mt: 0.25 }}>
              Settled paid
            </Typography>
          </Card>
        </Box>

        {/* 4. Filter & Search Toolbar */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: 3,
            border: "1px solid #e2e8f0",
            bgcolor: "#ffffff",
          }}
        >
          <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 1.5 }}>
            {/* Filter Tabs */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
              <Button
                size="small"
                variant={directionFilter === "all" ? "contained" : "outlined"}
                onClick={() => { setDirectionFilter("all"); setPage(0); }}
                sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}
              >
                All Entries ({stats.totalEntries})
              </Button>
              <Button
                size="small"
                variant={directionFilter === "receive" ? "contained" : "outlined"}
                onClick={() => { setDirectionFilter("receive"); setPage(0); }}
                sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}
              >
                To Receive ({stats.receiveEntriesCount})
              </Button>
              <Button
                size="small"
                variant={directionFilter === "pay" ? "contained" : "outlined"}
                onClick={() => { setDirectionFilter("pay"); setPage(0); }}
                sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}
              >
                To Pay ({stats.payEntriesCount})
              </Button>

              <Divider orientation="vertical" flexItem sx={{ mx: 0.5, display: { xs: "none", sm: "block" } }} />

              <Button
                size="small"
                variant={statusFilter === "all" ? "text" : "outlined"}
                onClick={() => { setStatusFilter(statusFilter === "Pending" ? "all" : "Pending"); setPage(0); }}
                color={statusFilter === "Pending" ? "warning" : "inherit"}
                sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}
              >
                {statusFilter === "Pending" ? "✓ Pending Only" : "Pending Only"}
              </Button>
              <Button
                size="small"
                variant={statusFilter === "Settled" ? "contained" : "text"}
                onClick={() => { setStatusFilter(statusFilter === "Settled" ? "all" : "Settled"); setPage(0); }}
                color={statusFilter === "Settled" ? "success" : "inherit"}
                sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}
              >
                {statusFilter === "Settled" ? "✓ Settled Only" : "Settled Only"}
              </Button>
            </Box>

            {/* Search Input */}
            <TextField
              size="small"
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: { xs: "100%", sm: 220 }, "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
            />
          </Box>
        </Paper>

        {/* 5. Transactions List (Mobile Card + Desktop Table) */}
        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            border: "1px solid #e2e8f0",
            bgcolor: "#ffffff",
            overflow: "hidden",
          }}
        >
          {/* Mobile Card View */}
          <Box sx={{ display: { xs: "block", md: "none" } }}>
            {filteredEntries.length === 0 ? (
              <Box sx={{ p: 4, textAlign: "center" }}>
                <Typography variant="body1" sx={{ fontWeight: 600, color: "text.secondary" }}>
                  No entries found
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  No transaction entries found for this member
                </Typography>
              </Box>
            ) : (
              <Stack spacing={1.5} sx={{ p: 1.5 }}>
                {filteredEntries.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((entry) => {
                  const isReceive = entry.directionType === "receive";
                  const isPending = entry.paymentStatus === "Pending";
                  return (
                    <Paper
                      key={entry._id}
                      elevation={0}
                      sx={{
                        p: 1.75,
                        borderRadius: 2.5,
                        border: "1px solid #e2e8f0",
                        bgcolor: "#ffffff",
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                          <Chip
                            label={entry.direction}
                            size="small"
                            color={isReceive ? "primary" : "warning"}
                            sx={{ height: 22, fontSize: "0.7rem", fontWeight: 700 }}
                          />
                          <Chip
                            label={entry.type}
                            size="small"
                            variant="outlined"
                            sx={{ height: 22, fontSize: "0.7rem" }}
                          />
                          {entry.isSplit && (
                            <Chip
                              icon={<CallSplitIcon sx={{ "&&": { fontSize: 13 } }} />}
                              label="Split"
                              size="small"
                              sx={{ height: 22, fontSize: "0.68rem" }}
                            />
                          )}
                        </Box>

                        <Chip
                          label={entry.paymentStatus}
                          size="small"
                          color={isPending ? "warning" : "success"}
                          variant={isPending ? "outlined" : "filled"}
                          sx={{ height: 22, fontSize: "0.7rem", fontWeight: 700 }}
                        />
                      </Box>

                      <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", my: 1 }}>
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: 800,
                            color: isReceive ? "#1976d2" : "#ea580c",
                            fontSize: "1.25rem",
                          }}
                        >
                          ₹ {formatAmount(entry.amount)}
                        </Typography>

                        <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600 }}>
                          {formatDate(entry.date)} • {entry.time || ""}
                        </Typography>
                      </Box>

                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pt: 1, borderTop: "1px solid #f1f5f9" }}>
                        <Typography variant="caption" sx={{ color: "#64748b" }}>
                          Source: <strong>{entry.creatorName}</strong>
                        </Typography>
                        {entry.description && (
                          <Typography variant="caption" sx={{ color: "#64748b", fontStyle: "italic", maxWidth: "60%" }} noWrap>
                            {entry.description}
                          </Typography>
                        )}
                      </Box>
                    </Paper>
                  );
                })}
              </Stack>
            )}
          </Box>

          {/* Desktop Table View */}
          <Box sx={{ display: { xs: "none", md: "block" } }}>
            <TableContainer>
              <Table sx={{ minWidth: 700 }}>
                <TableHead sx={{ bgcolor: "#f8fafc" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, color: "#475467" }}>Category</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: "#475467" }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: "#475467" }}>Date & Time</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: "#475467" }}>Creator / Source</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: "#475467" }}>Description</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: "#475467" }}>Status</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: "#475467" }}>Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredEntries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 6, color: "text.secondary" }}>
                        <Typography variant="body1" sx={{ fontWeight: 600, color: "text.secondary" }}>
                          No entries found
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          No transaction entries found for this member
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEntries.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((entry) => {
                      const isReceive = entry.directionType === "receive";
                      const isPending = entry.paymentStatus === "Pending";
                      return (
                        <TableRow key={entry._id} hover sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                          <TableCell>
                            <Chip
                              label={entry.direction}
                              size="small"
                              color={isReceive ? "primary" : "warning"}
                              sx={{ height: 24, fontSize: "0.75rem", fontWeight: 700 }}
                            />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {entry.type}
                              </Typography>
                              {entry.isSplit && (
                                <Chip
                                  icon={<CallSplitIcon sx={{ "&&": { fontSize: 13 } }} />}
                                  label="Split"
                                  size="small"
                                  sx={{ height: 20, fontSize: "0.68rem" }}
                                />
                              )}
                            </Box>
                          </TableCell>
                          <TableCell sx={{ whiteSpace: "nowrap" }}>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {formatDate(entry.date)}
                            </Typography>
                            <Typography variant="caption" sx={{ color: "text.secondary" }}>
                              {entry.time || ""}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ whiteSpace: "nowrap" }}>
                            <Chip
                              label={entry.creatorName}
                              size="small"
                              variant="outlined"
                              sx={{
                                height: 22,
                                fontSize: "0.72rem",
                                fontWeight: entry.isMine ? 500 : 700,
                                borderColor: entry.isMine ? "#cbd5e1" : "#1976d2",
                                color: entry.isMine ? "text.primary" : "primary.main",
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ maxWidth: 200 }}>
                            <Typography variant="body2" color="text.secondary" noWrap>
                              {entry.description || "—"}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={entry.paymentStatus}
                              size="small"
                              color={isPending ? "warning" : "success"}
                              variant={isPending ? "outlined" : "filled"}
                              sx={{ height: 22, fontSize: "0.72rem", fontWeight: 700 }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Typography
                              variant="body1"
                              sx={{
                                fontWeight: 800,
                                color: isReceive ? "#1976d2" : "#ea580c",
                              }}
                            >
                              ₹ {formatAmount(entry.amount)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          <TablePagination
            component="div"
            count={filteredEntries.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 25, 50]}
            sx={{ borderTop: "1px solid #e2e8f0" }}
          />
        </Paper>
      </Stack>
    </Box>
  );
};

export default MemberDetailPage;
