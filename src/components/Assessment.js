import ChainlinkAssessmentDiagnostic from './ChainlinkAssessmentDiagnostic';

const [showDiagnostics, setShowDiagnostics] = useState(false);

{activeQuestionSet?.verificationMethod === 'chainlink' && !submitting && !submitted && (
  <Button 
    variant="secondary" 
    className="me-2"
    onClick={() => setShowDiagnostics(!showDiagnostics)}
  >
    {showDiagnostics ? 'Hide Diagnostics' : 'Diagnostics'}
  </Button>
)}

{activeQuestionSet?.verificationMethod === 'chainlink' && showDiagnostics && (
  <ChainlinkAssessmentDiagnostic 
    questionManager={contracts.questionManager}
    questionSetId={activeQuestionSetId}
    answersHash={calculateAnswersHash(userAnswers)}
    onComplete={(result) => {
      if (result.success) {
        toast.success("Diagnostic passed! You can submit your assessment.");
      }
    }}
  />
)} 