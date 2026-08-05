import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";

interface PlaceholderPageProps {
  title: string;
  area: string;
  route: string;
}

export default function PlaceholderPage({
  title,
  area,
  route,
}: PlaceholderPageProps) {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        p: 3,
      }}
    >
      <Paper
        elevation={2}
        sx={{
          p: 4,
          maxWidth: 480,
          width: "100%",
          textAlign: "center",
        }}
      >
        <Typography variant="h4" component="h1" gutterBottom>
          {title}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
          <strong>Application Area:</strong>
          <br />
          {area}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
          <strong>Route:</strong>
          <br />
          {route}
        </Typography>
      </Paper>
    </Box>
  );
}
